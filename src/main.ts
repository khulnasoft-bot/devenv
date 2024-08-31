import * as vscode from 'vscode'
import * as path from 'path'
import { lw } from './lw'
lw.extensionRoot = path.resolve(`${__dirname}/../../`)
import { log } from './utils/logger'
lw.log = log.getLogger
const logger = lw.log('Extension')
logger.log('Initializing Dev Workshop.')
import { event } from './core/event'
lw.event = event
import { file } from './core/file'
lw.file = file
import { watcher } from './core/watcher'
lw.watcher = watcher
import { cache } from './core/cache'
lw.cache = cache
import { root } from './core/root'
lw.root = root
import { parser } from './parse'
lw.parser = parser
void lw.parser.parse.reset()
import { compile } from './compile'
lw.compile = compile
import { preview, server, viewer } from './preview'
lw.server = server
lw.viewer = viewer
lw.preview = preview
import { locate } from './locate'
lw.locate = locate
import { completion } from './completion'
lw.completion = completion
import { language } from './language'
lw.language = language
import { lint } from './lint'
lw.lint = lint
import { outline } from './outline'
lw.outline = outline
import { extra } from './extras'
lw.extra = extra
import * as commander from './core/commands'
lw.commands = commander

log.initStatusBarItem()

export function activate(extensionContext: vscode.ExtensionContext) {
    void vscode.commands.executeCommand('setContext', 'dev-workshop:enabled', true)

    logger.log(`Extension root: ${lw.extensionRoot}`)
    logger.log(`$PATH: ${process.env.PATH}`)
    logger.log(`$SHELL: ${process.env.SHELL}`)
    logger.log(`$LANG: ${process.env.LANG}`)
    logger.log(`$LC_ALL: ${process.env.LC_ALL}`)
    logger.log(`process.platform: ${process.platform}`)
    logger.log(`process.arch: ${process.arch}`)
    logger.log(`vscode.env.appName: ${vscode.env.appName}`)
    logger.log(`vscode.env.remoteName: ${vscode.env.remoteName}`)
    logger.log(`vscode.env.uiKind: ${vscode.env.uiKind}`)
    log.logConfig()
    log.logDeprecatedConfig()

    lw.onDispose(undefined, extensionContext.subscriptions)

    registerDevWorkshopCommands(extensionContext)

    extensionContext.subscriptions.push(vscode.workspace.onDidChangeConfiguration((ev) => {
        log.logConfigChange(ev)
    }))

    extensionContext.subscriptions.push(vscode.workspace.onDidSaveTextDocument( (e: vscode.TextDocument) => {
        if (e.uri.scheme !== 'file'){
            return
        }
        if (lw.file.hasTeXLangId(e.languageId) ||
            lw.cache.getIncludedTeX(lw.root.file.path, false).includes(e.fileName) ||
            lw.cache.getIncludedBib().includes(e.fileName)) {
            logger.log(`onDidSaveTextDocument triggered: ${e.uri.toString(true)}`)
            lw.lint.dev.root()
            void lw.compile.autoBuild(e.fileName, 'onSave')
            lw.extra.count(e.fileName)
        }
        // We don't check Dev ID as the reconstruct is handled by the Cacher.
        // We don't check BibTeX ID as the reconstruct is handled by the citation completer.
        if (lw.file.hasDtxLangId(e.languageId)) {
            void lw.outline.reconstruct()
        }
    }))

    let isDevActive = false
    extensionContext.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(async (e: vscode.TextEditor | undefined) => {
        const configuration = vscode.workspace.getConfiguration('dev-workshop')

        if (vscode.window.visibleTextEditors.filter(editor => lw.file.hasTeXLangId(editor.document.languageId)).length > 0) {
            logger.showStatus()
            if (configuration.get('view.autoFocus.enabled') && !isDevActive) {
                void vscode.commands.executeCommand('workbench.view.lw.dev-workshop-activitybar').then(() => vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup'))
            }
            isDevActive = true
        } else if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.languageId.toLowerCase() === 'log') {
            logger.showStatus()
        }

        if (e && e.document.uri.scheme !== 'file'){
            return
        }
        if (e && lw.file.hasTeXLangId(e.document.languageId) && e.document.fileName !== lw.previousActive?.document.fileName) {
            await lw.root.find()
            lw.lint.dev.root()
        } else if (!e || !lw.file.hasBibLangId(e.document.languageId)) {
            isDevActive = false
        }

        if (e && lw.file.hasTeXLangId(e.document.languageId)) {
            lw.previousActive = e
        }

        if (e && (
            lw.file.hasTeXLangId(e.document.languageId)
            || lw.file.hasBibLangId(e.document.languageId)
            || lw.file.hasDtxLangId(e.document.languageId))) {
            void lw.outline.refresh()
        }
    }))

    extensionContext.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        if (e.document.uri.scheme !== 'file'){
            return
        }
        if (!lw.file.hasTeXLangId(e.document.languageId) &&
            !lw.file.hasBibLangId(e.document.languageId) &&
            !lw.file.hasDtxLangId(e.document.languageId)) {
            return
        }
        lw.event.fire(lw.event.DocumentChanged)
        lw.lint.dev.on(e.document)
        lw.cache.refreshCacheAggressive(e.document.fileName)
    }))

    extensionContext.subscriptions.push(vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent) => {
        if (lw.file.hasTeXLangId(e.textEditor.document.languageId) ||
            lw.file.hasBibLangId(e.textEditor.document.languageId) ||
            lw.file.hasDtxLangId(e.textEditor.document.languageId)) {
            return lw.outline.reveal(e)
        }
        return
    }))

    registerProviders(extensionContext)

    void lw.root.find().then(() => {
        lw.lint.dev.root()
        if (lw.file.hasTeXLangId(vscode.window.activeTextEditor?.document.languageId ?? '')) {
            lw.previousActive = vscode.window.activeTextEditor
        }
    })
    conflictCheck()

    logger.log('Dev Workshop initialized.')
}

function registerDevWorkshopCommands(extensionContext: vscode.ExtensionContext) {
    extensionContext.subscriptions.push(
        vscode.commands.registerCommand('dev-workshop.saveWithoutBuilding', () => lw.commands.saveActive()),
        vscode.commands.registerCommand('dev-workshop.build', () => lw.commands.build()),
        vscode.commands.registerCommand('dev-workshop.recipes', (recipe: string | undefined) => lw.commands.recipes(recipe)),
        vscode.commands.registerCommand('dev-workshop.view', (uri: vscode.Uri) => lw.commands.view(uri)),
        vscode.commands.registerCommand('dev-workshop.refresh-viewer', () => lw.commands.refresh()),
        vscode.commands.registerCommand('dev-workshop.tab', () => lw.commands.view('tab')),
        vscode.commands.registerCommand('dev-workshop.viewInBrowser', () => lw.commands.view('browser')),
        vscode.commands.registerCommand('dev-workshop.viewExternal', () => lw.commands.view('external')),
        vscode.commands.registerCommand('dev-workshop.kill', () => lw.commands.kill()),
        vscode.commands.registerCommand('dev-workshop.synctex', () => lw.commands.synctex()),
        vscode.commands.registerCommand('dev-workshop.texdoc', (packageName: string | undefined) => lw.commands.texdoc(packageName)),
        vscode.commands.registerCommand('dev-workshop.texdocUsepackages', () => lw.commands.texdocUsepackages()),
        vscode.commands.registerCommand('dev-workshop.synctexto', (line: number, filePath: string) => lw.commands.synctexonref(line, filePath)),
        vscode.commands.registerCommand('dev-workshop.clean', () => lw.commands.clean()),
        vscode.commands.registerCommand('dev-workshop.actions', () => lw.commands.actions()),
        vscode.commands.registerCommand('dev-workshop.activate', () => undefined),
        vscode.commands.registerCommand('dev-workshop.citation', () => lw.commands.citation()),
        vscode.commands.registerCommand('dev-workshop.addtexroot', () => lw.commands.addTexRoot()),
        vscode.commands.registerCommand('dev-workshop.wordcount', () => lw.commands.wordcount()),
        vscode.commands.registerCommand('dev-workshop.log', () => lw.commands.showLog()),
        vscode.commands.registerCommand('dev-workshop.compilerlog', () => lw.commands.showLog('compiler')),
        vscode.commands.registerCommand('dev-workshop.code-action', (d: vscode.TextDocument, r: vscode.Range, c: number, m: string) => lw.lint.dev.action(d, r, c, m)),
        vscode.commands.registerCommand('dev-workshop.goto-section', (filePath: string, lineNumber: number) => lw.commands.gotoSection(filePath, lineNumber)),
        vscode.commands.registerCommand('dev-workshop.navigate-envpair', () => lw.commands.navigateToEnvPair()),
        vscode.commands.registerCommand('dev-workshop.select-envcontent', () => lw.commands.selectEnvContent('content')),
        vscode.commands.registerCommand('dev-workshop.select-env', () => lw.commands.selectEnvContent('whole')),
        vscode.commands.registerCommand('dev-workshop.select-envname', () => lw.commands.selectEnvName()),
        vscode.commands.registerCommand('dev-workshop.multicursor-envname', () => lw.commands.multiCursorEnvName()),
        vscode.commands.registerCommand('dev-workshop.toggle-equation-envname', () => lw.commands.toggleEquationEnv()),
        vscode.commands.registerCommand('dev-workshop.close-env', () => lw.commands.closeEnv()),
        vscode.commands.registerCommand('dev-workshop.wrap-env', () => lw.commands.insertSnippet('wrapEnv')),
        vscode.commands.registerCommand('dev-workshop.onEnterKey', () => lw.commands.onEnterKey()),
        vscode.commands.registerCommand('dev-workshop.onAltEnterKey', () => lw.commands.onEnterKey('alt')),
        vscode.commands.registerCommand('dev-workshop.revealOutputDir', () => lw.commands.revealOutputDir()),
        vscode.commands.registerCommand('dev-workshop.changeHostName', () => lw.commands.changeHostName()),
        vscode.commands.registerCommand('dev-workshop.resetHostName', () => lw.commands.resetHostName()),
        vscode.commands.registerCommand('dev-workshop-dev.parselog', () => lw.commands.devParseLog()),
        vscode.commands.registerCommand('dev-workshop-dev.parsetex', () => lw.commands.devParseTeX()),
        vscode.commands.registerCommand('dev-workshop-dev.parsebib', () => lw.commands.devParseBib()),
        vscode.commands.registerCommand('dev-workshop-dev.striptext', () => lw.commands.devStripText()),

        vscode.commands.registerCommand('dev-workshop.shortcut.item', () => lw.commands.insertSnippet('item')),
        vscode.commands.registerCommand('dev-workshop.shortcut.emph', () => lw.commands.toggleSelectedKeyword('emph')),
        vscode.commands.registerCommand('dev-workshop.shortcut.textbf', () => lw.commands.toggleSelectedKeyword('textbf')),
        vscode.commands.registerCommand('dev-workshop.shortcut.textit', () => lw.commands.toggleSelectedKeyword('textit')),
        vscode.commands.registerCommand('dev-workshop.shortcut.underline', () => lw.commands.toggleSelectedKeyword('underline')),
        vscode.commands.registerCommand('dev-workshop.shortcut.textrm', () => lw.commands.toggleSelectedKeyword('textrm')),
        vscode.commands.registerCommand('dev-workshop.shortcut.texttt', () => lw.commands.toggleSelectedKeyword('texttt')),
        vscode.commands.registerCommand('dev-workshop.shortcut.textsl', () => lw.commands.toggleSelectedKeyword('textsl')),
        vscode.commands.registerCommand('dev-workshop.shortcut.textsc', () => lw.commands.toggleSelectedKeyword('textsc')),
        vscode.commands.registerCommand('dev-workshop.shortcut.textnormal', () => lw.commands.toggleSelectedKeyword('textnormal')),
        vscode.commands.registerCommand('dev-workshop.shortcut.textsuperscript', () => lw.commands.toggleSelectedKeyword('textsuperscript')),
        vscode.commands.registerCommand('dev-workshop.shortcut.textsubscript', () => lw.commands.toggleSelectedKeyword('textsubscript')),
        vscode.commands.registerCommand('dev-workshop.shortcut.mathbf', () => lw.commands.toggleSelectedKeyword('mathbf')),
        vscode.commands.registerCommand('dev-workshop.shortcut.mathit', () => lw.commands.toggleSelectedKeyword('mathit')),
        vscode.commands.registerCommand('dev-workshop.shortcut.mathrm', () => lw.commands.toggleSelectedKeyword('mathrm')),
        vscode.commands.registerCommand('dev-workshop.shortcut.mathtt', () => lw.commands.toggleSelectedKeyword('mathtt')),
        vscode.commands.registerCommand('dev-workshop.shortcut.mathsf', () => lw.commands.toggleSelectedKeyword('mathsf')),
        vscode.commands.registerCommand('dev-workshop.shortcut.mathbb', () => lw.commands.toggleSelectedKeyword('mathbb')),
        vscode.commands.registerCommand('dev-workshop.shortcut.mathcal', () => lw.commands.toggleSelectedKeyword('mathcal')),
        vscode.commands.registerCommand('dev-workshop.surround', () => lw.completion.macro.surround()),

        vscode.commands.registerCommand('dev-workshop.promote-sectioning', () => lw.commands.shiftSectioningLevel('promote')),
        vscode.commands.registerCommand('dev-workshop.demote-sectioning', () => lw.commands.shiftSectioningLevel('demote')),
        vscode.commands.registerCommand('dev-workshop.select-section', () => lw.commands.selectSection()),

        vscode.commands.registerCommand('dev-workshop.bibsort', () => lw.lint.bibtex.format(true, false)),
        vscode.commands.registerCommand('dev-workshop.bibalign', () => lw.lint.bibtex.format(false, true)),
        vscode.commands.registerCommand('dev-workshop.bibalignsort', () => lw.lint.bibtex.format(true, true)),

        vscode.commands.registerCommand('dev-workshop.openMathPreviewPanel', () => lw.commands.openMathPreviewPanel()),
        vscode.commands.registerCommand('dev-workshop.closeMathPreviewPanel', () => lw.commands.closeMathPreviewPanel()),
        vscode.commands.registerCommand('dev-workshop.toggleMathPreviewPanel', () => lw.commands.toggleMathPreviewPanel())
    )
}

function registerProviders(extensionContext: vscode.ExtensionContext) {
    const configuration = vscode.workspace.getConfiguration('dev-workshop')

    // According to cmhughes/devindent.pl, it aims to beautify .tex, .sty and .cls files.
    const devindentSelector = selectDocumentsWithId(['tex', 'dev', 'dev-expl3'])
    const devSelector = selectDocumentsWithId(['dev', 'dev-expl3', 'pweave', 'jlweave', 'rsweave'])
    const weaveSelector = selectDocumentsWithId(['pweave', 'jlweave', 'rsweave'])
    const devDoctexSelector = selectDocumentsWithId(['dev', 'dev-expl3', 'pweave', 'jlweave', 'rsweave', 'doctex'])
    const bibtexSelector = selectDocumentsWithId(['bibtex'])

    extensionContext.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(devindentSelector, lw.lint.dev.formatter),
        vscode.languages.registerDocumentFormattingEditProvider(bibtexSelector, lw.lint.bibtex.formatter),
        vscode.languages.registerDocumentRangeFormattingEditProvider(devindentSelector, lw.lint.dev.formatter),
        vscode.languages.registerDocumentRangeFormattingEditProvider(bibtexSelector, lw.lint.bibtex.formatter)
    )

    extensionContext.subscriptions.push(
        vscode.window.registerWebviewPanelSerializer('dev-workshop-pdf', lw.viewer.serializer),
        vscode.window.registerCustomEditorProvider('dev-workshop-pdf-hook', lw.viewer.hook, {supportsMultipleEditorsPerDocument: true, webviewOptions: {retainContextWhenHidden: true}}),
        vscode.window.registerWebviewPanelSerializer('dev-workshop-mathpreview', lw.preview.mathpreview.serializer)
    )

    extensionContext.subscriptions.push(
        vscode.languages.registerHoverProvider(devSelector, lw.preview.provider),
        vscode.languages.registerDefinitionProvider(devSelector, lw.language.definition),
        vscode.languages.registerDocumentSymbolProvider(devSelector, lw.language.docSymbol),
        vscode.languages.registerDocumentSymbolProvider(bibtexSelector, lw.language.docSymbol),
        vscode.languages.registerDocumentSymbolProvider(selectDocumentsWithId(['doctex']), lw.language.docSymbol),
        vscode.languages.registerWorkspaceSymbolProvider(lw.language.projectSymbol)
    )

    extensionContext.subscriptions.push(
        vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'tex'}, lw.completion.provider, '\\', '{'),
        vscode.languages.registerCompletionItemProvider(bibtexSelector, lw.completion.bibProvider, '@')
    )

    let triggerDisposable: vscode.Disposable | undefined
    const registerTrigger = () => {
        const userTriggersDev = configuration.get('intellisense.triggers.dev') as string[]
        const devTriggers = ['\\', ',', '{', '}'].concat(userTriggersDev)
        logger.log(`Trigger characters for intellisense of Dev documents: ${JSON.stringify(devTriggers)}`)

        triggerDisposable = vscode.languages.registerCompletionItemProvider(devDoctexSelector, lw.completion.provider, ...devTriggers)
        extensionContext.subscriptions.push(triggerDisposable)
    }
    registerTrigger()
    lw.onConfigChange('intellisense.triggers.dev', () => {
        if (triggerDisposable) {
            triggerDisposable.dispose()
            triggerDisposable = undefined
        }
        registerTrigger()
    })

    let atSuggestionDisposable: vscode.Disposable | undefined
    const registerAtSuggestion = () => {
        const atSuggestionDevTrigger = vscode.workspace.getConfiguration('dev-workshop').get('intellisense.atSuggestion.trigger.dev') as string
        if (atSuggestionDevTrigger !== '') {
            lw.completion.atProvider.updateTrigger()
            atSuggestionDisposable = vscode.languages.registerCompletionItemProvider(devDoctexSelector, lw.completion.atProvider, atSuggestionDevTrigger)
            extensionContext.subscriptions.push(atSuggestionDisposable)
        }
    }
    registerAtSuggestion()
    lw.onConfigChange('intellisense.atSuggestion.trigger.dev', () => {
        if (atSuggestionDisposable) {
            atSuggestionDisposable.dispose()
            atSuggestionDisposable = undefined
        }
        registerAtSuggestion()
    })

    extensionContext.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(devSelector, lw.lint.dev.actionprovider),
        vscode.languages.registerFoldingRangeProvider(devSelector, lw.language.folding),
        vscode.languages.registerFoldingRangeProvider(weaveSelector, lw.language.weaveFolding)
    )

    const selectionDev = configuration.get('selection.smart.dev.enabled', true)
    if (selectionDev) {
        extensionContext.subscriptions.push(vscode.languages.registerSelectionRangeProvider({language: 'dev'}, lw.language.selectionRage))
    }

    extensionContext.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'dev-workshop-snippet-view',
            lw.extra.snippet.provider,
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    )
}

function conflictCheck() {
    function check(ID: string, name: string, suggestion: string) {
        if (vscode.extensions.getExtension(ID) !== undefined) {
            void vscode.window.showWarningMessage(`Dev Workshop is incompatible with  "${name}". ${suggestion}`)
        }
    }
    check('tomoki1207.pdf', 'vscode-pdf', 'We compete when opening a PDF file from the sidebar. Please consider disabling either extension.')
}

function selectDocumentsWithId(ids: string[]): vscode.DocumentSelector {
   const selector = ids.map( (id) => {
       return { scheme: 'file', language: id }
   })
   return selector
}
