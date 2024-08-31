import * as vscode from 'vscode'
import { lw } from '../lw'

lw.onConfigChange('dev.recipes', update)

function buildNode(parent: DevCommand, children: DevCommand[]) {
    if (children.length > 0) {
        parent.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed
        parent.children = children
        children.forEach((c) => c.parent = parent)
    }
    return parent
}

async function buildCommandTree(): Promise<DevCommand[]> {
    const commands: DevCommand[] = []
    const configuration = vscode.workspace.getConfiguration('dev-workshop', lw.root.getWorkspace())

    const buildCommand = new DevCommand(await lw.language.getLocaleString('command.build'), {command: 'dev-workshop.build'}, 'debug-start')
    const recipes = configuration.get('dev.recipes', []) as {name: string}[]
    const recipeCommands = await Promise.all(
        recipes.map(async recipe =>
            new DevCommand(await lw.language.getLocaleString('activity.recipe') + `: ${recipe.name}`, {command: 'dev-workshop.recipes', arguments: [recipe.name]}, 'debug-start')))
    let node: DevCommand
    node = buildNode(buildCommand, [
        new DevCommand(await lw.language.getLocaleString('command.clean'), {command: 'dev-workshop.clean'}, 'clear-all'),
        new DevCommand(await lw.language.getLocaleString('command.kill'), {command: 'dev-workshop.kill'}, 'debug-stop'),
        ...recipeCommands
    ])
    commands.push(node)

    const viewCommand = new DevCommand(await lw.language.getLocaleString('activity.view'), {command: 'dev-workshop.view'}, 'open-preview')
    node = buildNode(viewCommand, [
        new DevCommand(await lw.language.getLocaleString('activity.viewintab'), {command: 'dev-workshop.view', arguments: ['tab']}, 'open-preview'),
        new DevCommand(await lw.language.getLocaleString('activity.viewinweb'), {command: 'dev-workshop.view', arguments: ['browser']}, 'browser'),
        new DevCommand(await lw.language.getLocaleString('activity.viewinexternal'), {command: 'dev-workshop.view', arguments: ['external']}, 'preview'),
        new DevCommand(await lw.language.getLocaleString('command.refresh-viewer'), {command: 'dev-workshop.refresh-viewer'}, 'refresh')
    ])
    commands.push(node)

    const logCommand = new DevCommand(await lw.language.getLocaleString('activity.log'), {command: 'dev-workshop.log'}, 'output')
    const compilerLog = new DevCommand(await lw.language.getLocaleString('command.compilerlog'), {command: 'dev-workshop.compilerlog'}, 'output')
    const devWorkshopLog = new DevCommand(await lw.language.getLocaleString('command.log'), {command: 'dev-workshop.log'}, 'output')
    node = buildNode(logCommand, [
        devWorkshopLog,
        compilerLog
    ])
    commands.push(node)

    const navCommand = new DevCommand(await lw.language.getLocaleString('activity.navigate'), undefined, 'edit')
    node= buildNode(navCommand, [
        new DevCommand(await lw.language.getLocaleString('command.synctex'), {command: 'dev-workshop.synctex'}, 'go-to-file'),
        new DevCommand(await lw.language.getLocaleString('command.navigate-envpair'), {command: 'dev-workshop.navigate-envpair'}),
        new DevCommand(await lw.language.getLocaleString('command.select-envcontent'), {command: 'dev-workshop.select-envcontent'}),
        new DevCommand(await lw.language.getLocaleString('command.select-envname'), {command: 'dev-workshop.select-envname'}),
        new DevCommand(await lw.language.getLocaleString('command.close-env'), {command: 'dev-workshop.close-env'}),
        new DevCommand(await lw.language.getLocaleString('command.wrap-env'), {command: 'dev-workshop.wrap-env'}),
        new DevCommand(await lw.language.getLocaleString('command.addtexroot'), {command: 'dev-workshop.addtexroot'})
    ])
    commands.push(node)

    const miscCommand = new DevCommand(await lw.language.getLocaleString('activity.misc'), undefined, 'menu')
    node = buildNode(miscCommand, [
        new DevCommand(await lw.language.getLocaleString('command.citation'), {command: 'dev-workshop.citation'}),
        new DevCommand(await lw.language.getLocaleString('command.wordcount'), {command: 'dev-workshop.wordcount'}),
        new DevCommand(await lw.language.getLocaleString('command.revealoutput'), {command: 'dev-workshop.revealOutputDir'}, 'folder-opened')
    ])
    commands.push(node)

    const bibtexCommand = new DevCommand(await lw.language.getLocaleString('activity.bibtex'), undefined, 'references')
    node = buildNode(bibtexCommand, [
        new DevCommand(await lw.language.getLocaleString('command.bibalign'), {command: 'dev-workshop.bibalign'}),
        new DevCommand(await lw.language.getLocaleString('command.bibsort'), {command: 'dev-workshop.bibsort'}, 'sort-precedence'),
        new DevCommand(await lw.language.getLocaleString('command.bibalignsort'), {command: 'dev-workshop.bibalignsort'})
    ])
    commands.push(node)
    return commands
}


async function update() {
    state.commands = await buildCommandTree()
    state.treeDataProvider._onDidChangeTreeData.fire(undefined)
}

class CommandProvider implements vscode.TreeDataProvider<DevCommand> {
    readonly _onDidChangeTreeData: vscode.EventEmitter<DevCommand | undefined> = new vscode.EventEmitter<DevCommand | undefined>()
    readonly onDidChangeTreeData: vscode.Event<DevCommand | undefined> = this._onDidChangeTreeData.event

    getTreeItem(element: DevCommand): vscode.TreeItem {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(element.label, element.collapsibleState)
        treeItem.command = element.command
        treeItem.iconPath = element.codicon && new vscode.ThemeIcon(element.codicon)
        return treeItem
    }

    async getChildren(element?: DevCommand): Promise<DevCommand[]> {
        if (element) {
            return element.children
        }
        if (state.commands.length > 0) {
            return state.commands
        }
        state.commands = await buildCommandTree()
        return state.commands
    }

    getParent(element: DevCommand) {
        return element.parent
    }
}

class DevCommand {
    public children: DevCommand[] = []
    public readonly command: vscode.Command | undefined
    public collapsibleState = vscode.TreeItemCollapsibleState.None
    public parent: DevCommand | undefined

    constructor(
        public readonly label: string,
        command?: {command: string, arguments?: string[]},
        public readonly codicon?: string
    ) {
        if (command) {
            this.command = {...command, title: ''}
        }
    }
}

const treeDataProvider = new CommandProvider()
const state = {
    commands: [] as DevCommand[],
    view: vscode.window.createTreeView('dev-workshop-commands', { treeDataProvider, showCollapseAll: true }),
    treeDataProvider
}
