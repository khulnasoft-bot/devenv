import * as workerpool from 'workerpool'
import type * as Ast from '@unified-dev/unified-dev-types'
// import { getParser } from '@unified-dev/unified-dev-util-parse'
// import { attachMacroArgs } from '@unified-dev/unified-dev-util-arguments'
import { bibtexParser } from 'dev-utensils'

// @ts-expect-error Load unified.js from /out/src/...
import { getParser, attachMacroArgs } from '../../../../resources/unified.js'

type UnifiedParser = { parse: (content: string) => Ast.Root }

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
let unifiedParser: UnifiedParser = getParser({ flags: { autodetectExpl3AndAtLetter: true } })

function parseDev(content: string): Ast.Root {
    return unifiedParser.parse(content)
}

function parseArgs(ast: Ast.Root, macros: Ast.MacroInfoRecord) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    attachMacroArgs(ast, macros)
}

function reset(macros: Ast.MacroInfoRecord, environments: Ast.EnvInfoRecord) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    unifiedParser = getParser({ macros, environments, flags: { autodetectExpl3AndAtLetter: true } })
}

function parseBibTeX(s: string, options?: bibtexParser.ParserOptions): bibtexParser.BibtexAst {
    return bibtexParser.parse(s, options)
}

const worker = {
    parseDev,
    parseArgs,
    reset,
    parseBibTeX
}

workerpool.worker(worker)

export type Worker = typeof worker
