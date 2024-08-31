import * as path from 'path'
import * as workerpool from 'workerpool'
import type * as Ast from '@unified-dev/unified-dev-types'
import type { bibtexParser } from 'dev-utensils'
import { lw } from '../lw'
import type { Worker } from './parser/unified'
import { getEnvDefs, getMacroDefs } from './parser/unified-defs'
import { bibtexLogParser } from './parser/bibtexlog'
import { biberLogParser } from './parser/biberlog'
import { devLogParser } from './parser/devlog'
// @ts-expect-error Load unified.js from /out/src/...
import { toString } from '../../../resources/unified.js'

const logger = lw.log('Parser')

export const parser = {
    bib,
    log,
    tex,
    args,
    stringify,
    reset
}

const pool = workerpool.pool(
    path.join(__dirname, 'parser', 'unified.js'),
    { minWorkers: 1, maxWorkers: 1, workerType: 'thread' }
)
const proxy = pool.proxy<Worker>()

lw.onDispose({ dispose: async () => { await pool.terminate(true) } })

async function tex(content: string): Promise<Ast.Root> {
    return (await proxy).parseDev(content)
}

async function args(ast: Ast.Root): Promise<void> {
    return (await proxy).parseArgs(ast, getMacroDefs())
}

async function reset() {
    return (await proxy).reset(getMacroDefs(), getEnvDefs())
}

async function bib(s: string, options?: bibtexParser.ParserOptions): Promise<bibtexParser.BibtexAst | undefined> {
    let ast = undefined
    try {
        ast = (await proxy).parseBibTeX(s, options)
    } catch (err) {
        logger.logError('Error when parsing bib file.', err)
    }
    return ast
}

function stringify(ast: Ast.Ast): string {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
    return toString(ast)
}


// Notice that 'Output written on filename.pdf' isn't output in draft mode.
// https://github.com/khulnasoft/devenv/issues/2893#issuecomment-936312853
const devPattern = /^Output\swritten\son\s(.*)\s\(.*\)\.$/gm
const devFatalPattern = /Fatal error occurred, no output PDF file produced!/gm

const devmkPattern = /^Devmk:\sapplying\srule/gm
const devmkLog = /^Devmk:\sapplying\srule/
const devmkLogDev = /^Devmk:\sapplying\srule\s'(pdf|lua|xe)?dev'/
const devmkUpToDate = /^Devmk: All targets \(.*\) are up-to-date/m

const texifyPattern = /^running\s(pdf|lua|xe)?dev/gm
const texifyLog = /^running\s((pdf|lua|xe)?dev|miktex-bibtex)/
const texifyLogDev = /^running\s(pdf|lua|xe)?dev/

const bibtexPattern = /^This is BibTeX, Version.*$/m
const biberPattern = /^INFO - This is Biber .*$/m
const bibtexPatternAlt = /^The top-level auxiliary file: .*$/m // #4197

/**
 * @param msg The log message to parse.
 * @param rootFile The current root file.
 * @returns whether the current compilation is indeed a skipped one in devmk.
 */
function log(msg: string, rootFile?: string): boolean {
    let isDevmkSkipped = false
    // Canonicalize line-endings
    msg = msg.replace(/(\r\n)|\r/g, '\n')

    if (msg.match(bibtexPattern)) {
        bibtexLogParser.parse(msg.match(devmkPattern) ? trimDevmkBibTeX(msg) : msg, rootFile)
        bibtexLogParser.showLog()
    } else if (msg.match(biberPattern)) {
        biberLogParser.parse(msg.match(devmkPattern) ? trimDevmkBiber(msg) : msg, rootFile)
        biberLogParser.showLog()
    } else if (msg.match(bibtexPatternAlt)) {
        bibtexLogParser.parse(msg.match(devmkPattern) ? trimDevmkBibTeX(msg) : msg, rootFile)
        bibtexLogParser.showLog()
    }

    if (msg.match(devmkPattern)) {
        msg = trimDevmk(msg)
    } else if (msg.match(texifyPattern)) {
        msg = trimTexify(msg)
    }
    if (msg.match(devPattern) || msg.match(devFatalPattern)) {
        devLogParser.parse(msg, rootFile)
        devLogParser.showLog()
    } else if (devmkSkipped(msg)) {
        isDevmkSkipped = true
    }

    return isDevmkSkipped
}

function trimDevmk(msg: string): string {
    return trimPattern(msg, devmkLogDev, devmkLog)
}

function trimDevmkBibTeX(msg: string): string {
    return trimPattern(msg, bibtexPattern, devmkLogDev)
}

function trimDevmkBiber(msg: string): string {
    return trimPattern(msg, biberPattern, devmkLogDev)
}

function trimTexify(msg: string): string {
    return trimPattern(msg, texifyLogDev, texifyLog)
}


/**
 * Return the lines between the last occurrences of `beginPattern` and `endPattern`.
 * If `endPattern` is not found, the lines from the last occurrence of
 * `beginPattern` up to the end is returned.
 */
function trimPattern(msg: string, beginPattern: RegExp, endPattern: RegExp): string {
    const lines = msg.split('\n')
    let startLine = -1
    let finalLine = -1
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index]
        let result = line.match(beginPattern)
        if (result) {
            startLine = index
        }
        result = line.match(endPattern)
        if (result) {
            finalLine = index
        }
    }
    if (finalLine <= startLine) {
        return lines.slice(startLine).join('\n')
    } else {
        return lines.slice(startLine, finalLine).join('\n')
    }
}


function devmkSkipped(msg: string): boolean {
    if (msg.match(devmkUpToDate) && !msg.match(devmkPattern)) {
        devLogParser.showLog()
        bibtexLogParser.showLog()
        biberLogParser.showLog()
        return true
    }
    return false
}
