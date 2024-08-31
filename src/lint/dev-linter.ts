import * as vscode from 'vscode'
import { lw } from '../lw'
import type { DevLinter } from '../types'
import { chkTeX } from './dev-linter/chktex'
import { laCheck } from './dev-linter/lacheck'

const logger = lw.log('Linter')

export const lint = {
    on,
    root
}

let linterTimeout: NodeJS.Timeout | undefined

function getLinters(scope?: vscode.ConfigurationScope): DevLinter[] {
    const configuration = vscode.workspace.getConfiguration('dev-workshop', scope)
    const linters: DevLinter[] = []
    if (configuration.get('linting.chktex.enabled')) {
        linters.push(chkTeX)
    } else {
        chkTeX.linterDiagnostics.clear()
    }
    if (configuration.get('linting.lacheck.enabled')) {
        linters.push(laCheck)
    } else {
        laCheck.linterDiagnostics.clear()
    }
    return linters
}

function root() {
    const linters = getLinters(lw.root.getWorkspace())
    linters.forEach(linter => {
        if (lw.root.file.path === undefined) {
            logger.log(`No root file found for ${linter.getName()}.`)
            return
        }
        logger.log(`${linter.getName()} lints root ${lw.root.file.path} .`)
        void linter.lintRootFile(lw.root.file.path)
    })
}

function on(document: vscode.TextDocument) {
    const configuration = vscode.workspace.getConfiguration('dev-workshop', document.uri)
    const linters = getLinters(document.uri)
    if (linters.length > 0
        && (configuration.get('linting.run') as string) === 'onType') {
        const interval = configuration.get('linting.delay') as number
        if (linterTimeout) {
            clearTimeout(linterTimeout)
        }
        linterTimeout = setTimeout(() => linters.forEach(linter => {
            logger.log(`${linter.getName()} lints ${document.fileName} .`)
            void linter.lintFile(document)
        }), interval)
    }
}
