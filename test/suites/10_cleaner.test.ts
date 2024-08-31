import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as assert from 'assert'
import { lw } from '../../src/lw'
import * as test from './utils'

suite('Cleaner test suite', () => {
    test.suite.name = path.basename(__filename).replace('.test.js', '')
    test.suite.fixture = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('dev-workshop.activate')
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.outDir', undefined)
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.autoBuild.run', 'never')
    })

    teardown(async () => {
        await test.reset()

        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.fileTypes', undefined)
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.subfolder.enabled', undefined)
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.method', undefined)
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.command', undefined)
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.args', undefined)
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.autoClean.run', undefined)
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.autoBuild.cleanAndRetry.enabled', undefined)
    })

    test.run('glob clean', async (fixture: string) => {
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.method', 'glob')
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'},
            {src: 'empty', dst: 'main.aux'},
            {src: 'empty', dst: 'main.fls'},
            {src: 'empty', dst: 'sub.aux'}
        ], {skipCache: true})
        await lw.extra.clean(path.resolve(fixture, 'main.tex'))
        assert.ok(!fs.existsSync(path.resolve(fixture, 'main.aux')))
        assert.ok(!fs.existsSync(path.resolve(fixture, 'main.fls')))
        assert.ok(fs.existsSync(path.resolve(fixture, 'sub.aux')))
    })

    test.run('glob clean with `dev-workshop.dev.clean.fileTypes`', async (fixture: string) => {
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.method', 'glob')
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.fileTypes', ['*.aux'])
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'},
            {src: 'empty', dst: 'main.aux'},
            {src: 'empty', dst: 'main.fls'},
            {src: 'empty', dst: 'sub.aux'}
        ], {skipCache: true})
        await lw.extra.clean(path.resolve(fixture, 'main.tex'))
        assert.ok(!fs.existsSync(path.resolve(fixture, 'main.aux')))
        assert.ok(fs.existsSync(path.resolve(fixture, 'main.fls')))
        assert.ok(!fs.existsSync(path.resolve(fixture, 'sub.aux')))
    })

    test.run('glob clean with `dev.clean.subfolder.enabled`', async (fixture: string) => {
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.method', 'glob')
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.subfolder.enabled', false)
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'},
            {src: 'empty', dst: 'out/main.aux'}
        ], {skipCache: true})
        await lw.extra.clean(path.resolve(fixture, 'main.tex'))
        assert.ok(fs.existsSync(path.resolve(fixture, 'out/main.aux')))

        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.subfolder.enabled', true)
        await lw.extra.clean(path.resolve(fixture, 'main.tex'))
        assert.ok(!fs.existsSync(path.resolve(fixture, 'out/main.aux')))
    })

    test.run('devmk clean', async (fixture: string) => {
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.command', 'devmk')
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.args', ['-c', '%TEX%'])
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'},
            {src: 'empty', dst: 'main.aux'}
        ], {skipCache: true})
        await lw.extra.clean()
        assert.ok(!fs.existsSync(path.resolve(fixture, 'main.aux')))
    })

    test.run('devmk clean with auxdir', async (fixture: string) => {
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.command', 'devmk')
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.args', ['-c', '-auxdir=%OUTDIR%/aux_files', '%TEX%'])
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'},
            {src: 'empty', dst: 'aux_files/main.aux'}
        ], {skipCache: true})
        await lw.extra.clean()
        assert.ok(!fs.existsSync(path.resolve(fixture, 'aux_files/main.aux')))
    })

    test.run('clean with `dev.autoClean.run` on `never` and failed build', async (fixture: string) => {
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.method', 'glob')
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.fileTypes', ['*.aux','*.fls', '*.pdf'])
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.autoBuild.cleanAndRetry.enabled', false)
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.autoClean.run', 'never')
        await test.load(fixture, [
            {src: 'invalid_cmd.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await lw.extra.clean() // Clean up previous remainders to ensure next build to fail
        const cleaned = test.wait(lw.event.AutoCleaned).then(() => true)
        await test.build(fixture, 'main.tex')
        const result = await Promise.any([cleaned, test.sleep(1000)])
        assert.ok(!result)
    })

    test.run('clean with `dev.autoClean.run` on `never` and passed build', async (fixture: string) => {
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.autoClean.run', 'never')
        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await lw.extra.clean()
        const cleaned = test.wait(lw.event.AutoCleaned).then(() => true)
        await test.build(fixture, 'main.tex')
        const result = await Promise.any([cleaned, test.sleep(1000)])
        assert.ok(!result)
    })

    test.run('clean with `dev.autoClean.run` on `onFailed`', async (fixture: string) => {
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.method', 'glob')
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.fileTypes', ['*.aux','*.fls', '*.pdf'])
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.autoBuild.cleanAndRetry.enabled', false)
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.autoClean.run', 'onFailed')
        await test.load(fixture, [
            {src: 'invalid_cmd.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await lw.extra.clean() // Clean up previous remainders to ensure next build to fail
        let cleaned = test.wait(lw.event.AutoCleaned).then(() => true)
        await test.build(fixture, 'main.tex')
        let result = await Promise.any([cleaned, test.sleep(1000)])
        assert.ok(result)

        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await lw.extra.clean() // Clean up previous remainders to ensure next build to fail
        cleaned = test.wait(lw.event.AutoCleaned).then(() => true)
        await test.build(fixture, 'main.tex')
        result = await Promise.any([cleaned, test.sleep(1000)])
        assert.ok(!result)
    })

    test.run('clean with `dev.autoClean.run` on `onBuilt`', async (fixture: string) => {
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.method', 'glob')
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.fileTypes', ['*.aux','*.fls', '*.pdf'])
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.autoBuild.cleanAndRetry.enabled', false)
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.autoClean.run', 'onBuilt')
        await test.load(fixture, [
            {src: 'invalid_cmd.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await lw.extra.clean() // Clean up previous remainders to ensure next build to fail
        let cleaned = test.wait(lw.event.AutoCleaned).then(() => true)
        await test.build(fixture, 'main.tex')
        let result = await Promise.any([cleaned, test.sleep(1000)])
        assert.ok(result)

        await test.load(fixture, [
            {src: 'base.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await lw.extra.clean()
        cleaned = test.wait(lw.event.AutoCleaned).then(() => true)
        await test.build(fixture, 'main.tex')
        result = await Promise.any([cleaned, test.sleep(1000)])
        assert.ok(result)
    })

    test.run('clean and retry on failed build', async (fixture: string) => {
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.method', 'glob')
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.clean.fileTypes', ['*.aux','*.fls', '*.pdf'])
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.autoBuild.cleanAndRetry.enabled', false)
        await vscode.workspace.getConfiguration('dev-workshop').update('dev.build.forceRecipeUsage', false)
        await test.load(fixture, [
            {src: 'invalid_cmd.tex', dst: 'main.tex'}
        ], {skipCache: true})
        await lw.extra.clean() // Clean up previous remainders to ensure next build to fail
        let cleaned = test.wait(lw.event.AutoCleaned).then(() => true)
        await test.build(fixture, 'main.tex')
        let result = await Promise.any([cleaned, test.sleep(1000)])
        assert.ok(!result)

        await vscode.workspace.getConfiguration('dev-workshop').update('dev.autoBuild.cleanAndRetry.enabled', true)
        await lw.extra.clean()
        cleaned = test.wait(lw.event.AutoCleaned).then(() => true)
        await test.build(fixture, 'main.tex')
        result = await Promise.any([cleaned, test.sleep(1000)])
        assert.ok(result)
    })
})
