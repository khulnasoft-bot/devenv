import * as vscode from 'vscode'
import * as path from 'path'
import { lw } from '../../lw'
import { type IParser, type LogEntry, showCompilerDiagnostics } from './parserutils'


const logger = lw.log('Parser', 'TexLog')

const devError = /^(?:(.*):(\d+):|!)(?: (.+) Error:)? (.+?)$/
const devOverfullBox = /^(Overfull \\[vh]box \([^)]*\)) in paragraph at lines (\d+)--(\d+)$/
const devOverfullBoxAlt = /^(Overfull \\[vh]box \([^)]*\)) detected at line (\d+)$/
const devOverfullBoxOutput = /^(Overfull \\[vh]box \([^)]*\)) has occurred while \\output is active(?: \[(\d+)\])?/
const devUnderfullBox = /^(Underfull \\[vh]box \([^)]*\)) in paragraph at lines (\d+)--(\d+)$/
const devUnderfullBoxAlt = /^(Underfull \\[vh]box \([^)]*\)) detected at line (\d+)$/
const devUnderfullBoxOutput = /^(Underfull \\[vh]box \([^)]*\)) has occurred while \\output is active(?: \[(\d+)\])?/
const devWarn = /^((?:(?:Class|Package|Module) \S*)|Dev(?: \S*)?|Dev3) (Warning|Info):\s+(.*?)(?: on(?: input)? line (\d+))?(\.|\?|)$/
const devPackageWarningExtraLines = /^\((.*)\)\s+(.*?)(?: +on input line (\d+))?(\.)?$/
const devMissChar = /^\s*(Missing character:.*?!)/
const bibEmpty = /^Empty `thebibliography' environment/
const biberWarn = /^Biber warning:.*WARN - I didn't find a database entry for '([^']+)'/

// Dev Warning: Reference `non-exist' on page 1 undefined on input line 10.
// Dev Warning: Citation `also-nothing' on page 1 undefined on input line 12.
const UNDEFINED_REFERENCE = /^Dev Warning: (Reference|Citation) `(.*?)' on page (?:\d+) undefined on input line (\d+).$/

// const truncatedLine = /(.{77}[^\.](\w|\s|-|\\|\/))(\r\n|\n)/g
// A line with an error message will start with an 'l' character followed by a line number and then a space.
// After that it shows the line with the error but only up to the position of the error.
// If the error comes very late in the line, the error output will start with 3 dots.
// The regular expression is set up to include the 3 dots as an optional element, such that the capture group $2
// always contains actual text that appears in the line.
const messageLine = /^l\.\d+\s(\.\.\.)?(.*)$/

const texDiagnostics = vscode.languages.createDiagnosticCollection('Dev')

const buildLog: LogEntry[] = []

export const devLogParser: IParser = {
    showLog,
    parse
}

function showLog() {
    showCompilerDiagnostics(texDiagnostics, buildLog)
}

type ParserState = {
    searchEmptyLine: boolean,
    insideBoxWarn: boolean,
    insideError: boolean,
    currentResult: LogEntry,
    nested: number,
    rootFile: string,
    fileStack: string[]
}

function initParserState(rootFile: string): ParserState {
    return {
        searchEmptyLine: false,
        insideBoxWarn: false,
        insideError: false,
        currentResult: { type: '', file: '', text: '', line: 1 },
        nested: 0,
        rootFile,
        fileStack: [ rootFile ]
    }
}

function parse(log: string, rootFile?: string) {
    if (rootFile === undefined) {
        rootFile = lw.root.file.path
    }
    if (rootFile === undefined) {
        logger.log('How can you reach this point?')
        return []
    }

    const lines = log.split('\n')
    buildLog.length = 0

    const state = initParserState(rootFile)
    for(const line of lines) {
        parseLine(line, state)
    }

    // Push the final result
    if (state.currentResult.type !== '' && !state.currentResult.text.match(bibEmpty)) {
        buildLog.push(state.currentResult)
    }
    logger.log(`Logged ${buildLog.length} messages.`)
    return buildLog
}

function parseLine(line: string, state: ParserState) {
    const configuration = vscode.workspace.getConfiguration('dev-workshop')
    let excludeRegexp: RegExp[]
    try {
        excludeRegexp = (configuration.get('message.devlog.exclude') as string[]).map(regexp => RegExp(regexp))
    } catch (e) {
        logger.logError('Invalid message.devlog.exclude config.', e)
        return
    }
    // Compose the current file
    const filename = path.resolve(path.dirname(state.rootFile), state.fileStack[state.fileStack.length - 1])
    // Skip the first line after a box warning, this is just garbage
    if (state.insideBoxWarn) {
        state.insideBoxWarn = false
        return
    }
    // Append the read line, since we have a corresponding result in the matching
    if (state.searchEmptyLine) {
        if (line.trim() === '' || (state.insideError && line.match(/^\s/))) {
            state.currentResult.text = state.currentResult.text + '\n'
            state.searchEmptyLine = false
            state.insideError = false
        } else {
            const packageExtraLineResult = line.match(devPackageWarningExtraLines)
            if (packageExtraLineResult) {
                state.currentResult.text += '\n(' + packageExtraLineResult[1] + ')\t' + packageExtraLineResult[2] + (packageExtraLineResult[4] ? '.' : '')
                state.currentResult.line = packageExtraLineResult[3] ? parseInt(packageExtraLineResult[3], 10) : 1
            } else if (state.insideError) {
                const match = messageLine.exec(line)
                if (match && match.length >= 2) {
                    const subLine = match[2]
                    // remember the text where the error message occurred:
                    state.currentResult.errorPosText = subLine
                    // skip rest of error message (usually not useful)
                    state.searchEmptyLine = false
                    state.insideError = false
                } else {
                    state.currentResult.text = state.currentResult.text + '\n' + line
                }
            } else {
                state.currentResult.text = state.currentResult.text + '\n' + line
            }
        }
        return
    }
    for (const regexp of excludeRegexp) {
        if (line.match(regexp)) {
            return
        }
    }
    if (parseUndefinedReference(line, filename, state)) {
        return
    }
    if (parseBadBox(line, filename, state, configuration.get('message.badbox.show'))) {
        return
    }
    let result = line.match(devMissChar)
    if (result) {
        if (state.currentResult.type !== '') {
            buildLog.push(state.currentResult)
        }
        state.currentResult = {
            type: 'warning',
            file: filename,
            line: 1,
            text: result[1]
        }
        state.searchEmptyLine = false
        return
    }
    result = line.match(devWarn)
    if (result) {
        if (state.currentResult.type !== '') {
            buildLog.push(state.currentResult)
        }
        state.currentResult = {
            type: 'warning',
            file: filename,
            line: result[4] ? parseInt(result[4], 10) : 1,
            text: result[1] + ': ' + result[3] + result[5]
        }
        state.searchEmptyLine = true
        return
    }
    result = line.match(biberWarn)
    if (result) {
        if (state.currentResult.type !== '') {
            buildLog.push(state.currentResult)
        }
        state.currentResult = {
            type: 'warning',
            file: '',
            line: 1,
            text: `No bib entry found for '${result[1]}'`
        }
        state.searchEmptyLine = false
        parseLine(line.substring(result[0].length), state)
        return
    }

    result = line.match(devError)
    if (result) {
        if (state.currentResult.type !== '') {
            buildLog.push(state.currentResult)
        }
        state.currentResult = {
            type: 'error',
            text: (result[3] && result[3] !== 'Dev') ? `${result[3]}: ${result[4]}` : result[4],
            file: result[1] ? path.resolve(path.dirname(state.rootFile), result[1]) : filename,
            line: result[2] ? parseInt(result[2], 10) : 1
        }
        state.searchEmptyLine = true
        state.insideError = true
        return
    }
    state.nested = parseDevFileStack(line, state.fileStack, state.nested)
    if (state.fileStack.length === 0) {
        state.fileStack.push(state.rootFile)
    }
}

function parseUndefinedReference(line: string, filename: string, state: ParserState): boolean {
    if (line === 'Dev Warning: There were undefined references.') {
        return true
    }
    const match = line.match(UNDEFINED_REFERENCE)
    if (match === null) {
        return false
    }

    if (state.currentResult.type !== '') {
        buildLog.push(state.currentResult)
    }
    state.currentResult = {
        type: 'warning',
        file: filename,
        line: match[3] ? parseInt(match[3], 10) : 1,
        text: `Cannot find ${match[1].toLowerCase()} \`${match[2]}\`.`,
        errorPosText: match[2]
    }
    state.searchEmptyLine = false

    return true
}

function parseBadBox(line: string, filename: string, state: ParserState, type?: 'both' | 'overfull' | 'underfull' | 'none'): boolean {
    if (type === undefined || type === 'none') {
        return false
    }
    const regexs = []
    if (['both', 'overfull'].includes(type)) {
        regexs.push(devOverfullBox, devOverfullBoxAlt, devOverfullBoxOutput)
    }
    if (['both', 'underfull'].includes(type)) {
        regexs.push(devUnderfullBox, devUnderfullBoxAlt, devUnderfullBoxOutput)
    }
    for (const regex of regexs) {
        const result = line.match(regex)
        if (result === null) {
            continue
        }
        if (state.currentResult.type !== '') {
            buildLog.push(state.currentResult)
        }
        if ([devOverfullBoxOutput, devUnderfullBoxOutput].includes(regex)) {
            state.currentResult = {
                type: 'typesetting',
                file: filename,
                line: 1,
                text: result[2] ? `${result[1]} in page ${result[2]}` : result[1]
            }
        } else {
            state.currentResult = {
                type: 'typesetting',
                file: filename,
                line: parseInt(result[2], 10),
                text: result[1]
            }
            state.insideBoxWarn = true
        }
        state.searchEmptyLine = false
        parseLine(line.substring(result[0].length), state)
        return true
    }
    return false
}

function parseDevFileStack(line: string, fileStack: string[], nested: number): number {
    const result = line.match(/(\(|\))/)
    if (result && result.index !== undefined && result.index > -1) {
        line = line.substring(result.index + 1)
        if (result[1] === '(') {
            const pathResult = line.match(/^"?((?:(?:[a-zA-Z]:|\.|\/)?(?:\/|\\\\?))[^"()[\]]*)/)
            const mikTeXPathResult = line.match(/^"?([^"()[\]]*\.[a-z]{3,})/)
            if (pathResult) {
                fileStack.push(pathResult[1].trim())
            } else if (mikTeXPathResult) {
                fileStack.push(`./${mikTeXPathResult[1].trim()}`)
            } else {
                nested += 1
            }
        } else {
            if (nested > 0) {
                nested -= 1
            } else {
                fileStack.pop()
            }
        }
        nested = parseDevFileStack(line, fileStack, nested)
    }
    return nested
}
