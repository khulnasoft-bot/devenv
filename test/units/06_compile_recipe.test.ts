import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import Sinon, * as sinon from 'sinon'
import { assert, get, has, mock, set } from './utils'
import { lw } from '../../src/lw'
import { queue } from '../../src/compile/queue'
import { _test as recipe } from '../../src/compile/recipe'
import type { Tool } from '../../src/types'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]

    before(() => {
        mock.object(lw, 'file', 'root')
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.compile->queue', () => {
        beforeEach(() => {
            queue.clear()
        })

        it('should clear the queue', () => {
            queue.add({ name: 'dev', command: 'pdfdev' }, 'main.tex', 'Recipe1', Date.now(), false)
            assert.strictEqual(queue._test.getQueue().steps.length, 1)

            queue.clear()
            assert.strictEqual(queue._test.getQueue().steps.length, 0)
        })

        it('should get the next step from the queue', () => {
            queue.add({ name: 'dev', command: 'pdfdev' }, 'main.tex', 'Recipe1', Date.now(), false)
            queue.add({ name: 'bibtex', command: 'bibtex' }, 'main.tex', 'Recipe1', Date.now(), false)

            const step1 = queue.getStep()
            const step2 = queue.getStep()

            assert.strictEqual(step1?.name, 'dev')
            assert.strictEqual(step2?.name, 'bibtex')
        })

        it('should add a Tool as a RecipeStep to the queue', () => {
            queue.add({ name: 'dev', command: 'pdfdev' }, 'main.tex', 'Recipe1', Date.now())

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.rootFile, 'main.tex')
            assert.strictEqual(step.recipeName, 'Recipe1')
            assert.strictEqual(step.isExternal, false)
        })

        it('should add a Tool as an ExternalStep to the queue', () => {
            queue.add({ name: 'dev', command: 'pdfdev' }, 'main.tex', 'Recipe1', Date.now(), true, '/usr/bin')

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.recipeName, 'External')
            assert.strictEqual(step.isExternal, true)
            assert.strictEqual(step.cwd, '/usr/bin')
        })

        it('should prepend a Tool as a RecipeStep to the queue', () => {
            queue.add({ name: 'dev', command: 'pdfdev' }, 'main.tex', 'Recipe1', Date.now())

            let step = queue.getStep()
            queue.clear()
            queue.add({ name: 'dev', command: 'pdfdev' }, 'alt.tex', 'Recipe1', Date.now())

            assert.ok(step)
            queue.prepend(step)

            step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.rootFile, 'main.tex')
            assert.strictEqual(step.recipeName, 'Recipe1')
            assert.strictEqual(step.isExternal, false)
        })

        it('should check if the last step in the queue', () => {
            queue.add({ name: 'dev', command: 'pdfdev' }, 'main.tex', 'Recipe1', Date.now(), false)

            let step = queue.getStep()
            assert.ok(step)
            assert.ok(queue.isLastStep(step))

            queue.add({ name: 'dev', command: 'pdfdev' }, 'main.tex', 'Recipe1', Date.now(), false)
            queue.add({ name: 'dev', command: 'pdfdev' }, 'main.tex', 'Recipe1', Date.now() + 1, false)

            step = queue.getStep()
            assert.ok(step)
            assert.ok(queue.isLastStep(step))
        })

        it('should get the formatted string representation of a step', () => {
            queue.add({ name: 'dev', command: 'pdfdev' }, 'main.tex', 'Recipe1', Date.now(), false)

            const step = queue.getStep()
            assert.ok(step)
            const stepString = queue.getStepString(step)
            assert.strictEqual(stepString, 'Recipe1')
        })

        it('should get correct step repr with multiple recipes', () => {
            queue.add({ name: 'dev', command: 'pdfdev' }, 'main.tex', 'Recipe1', Date.now(), false)
            queue.add({ name: 'dev', command: 'pdfdev' }, 'main.tex', 'Recipe1', Date.now() + 1, false)
            const step = queue.getStep()
            assert.ok(step)
            const stepString = queue.getStepString(step)
            assert.strictEqual(stepString, 'Recipe1')
        })

        it('should get correct step repr with multiple tools in one recipe', () => {
            const recipeTime = Date.now()
            queue.add({ name: 'dev1', command: 'pdfdev' }, 'main.tex', 'Recipe1', recipeTime, false)
            queue.add({ name: 'dev2', command: 'pdfdev' }, 'main.tex', 'Recipe1', recipeTime, false)

            let step = queue.getStep()
            assert.ok(step)
            let stepString = queue.getStepString(step)
            assert.strictEqual(stepString, 'Recipe1: 1/2 (dev1)')

            step = queue.getStep()
            assert.ok(step)
            stepString = queue.getStepString(step)
            assert.strictEqual(stepString, 'Recipe1: 2/2 (dev2)')
        })
    })

    describe('lw.compile->recipe', () => {
        it('should set the DEVENV_DOCKER_DEV environment variable based on the configuration', async () => {
            const expectedImageName = 'your-docker-image'

            await set.config('docker.image.dev', expectedImageName)
            recipe.setDockerImage()

            assert.strictEqual(process.env['DEVENV_DOCKER_DEV'], expectedImageName)
        })

        it('should set the DEVENV_DOCKER_PATH environment variable based on the configuration', async () => {
            const expectedDockerPath = '/usr/local/bin/docker'

            await set.config('docker.path', expectedDockerPath)
            recipe.setDockerPath()

            assert.strictEqual(process.env['DEVENV_DOCKER_PATH'], expectedDockerPath)
        })
    })

    describe('lw.compile->recipe.createOutputSubFolders', () => {
        let getOutDirStub: sinon.SinonStub
        let getIncludedTeXStub: sinon.SinonStub

        before(() => {
            getOutDirStub = sinon.stub(lw.file, 'getOutDir')
            getIncludedTeXStub = lw.cache.getIncludedTeX as sinon.SinonStub
        })

        afterEach(() => {
            getOutDirStub.reset()
            getIncludedTeXStub.reset()
        })

        after(() => {
            getOutDirStub.restore()
        })

        it('should resolve the output directory relative to the root directory if not absolute', () => {
            const rootFile = set.root(fixture, 'main.tex')
            const relativeOutDir = 'output'
            const expectedOutDir = path.resolve(path.dirname(rootFile), relativeOutDir)

            getOutDirStub.returns(relativeOutDir)
            getIncludedTeXStub.returns([rootFile])

            recipe.createOutputSubFolders(rootFile)

            assert.strictEqual(getOutDirStub.getCall(0).args[0], rootFile)
            assert.ok(has.log(`outDir: ${expectedOutDir} .`))
        })

        it('should use the absolute output directory as is', () => {
            const rootFile = set.root(fixture, 'main.tex')
            const absoluteOutDir = '/absolute/output'

            getOutDirStub.returns(absoluteOutDir)
            getIncludedTeXStub.returns([rootFile])

            recipe.createOutputSubFolders(rootFile)

            assert.strictEqual(getOutDirStub.getCall(0).args[0], rootFile)
            assert.ok(has.log(`outDir: ${absoluteOutDir} .`))
        })

        it('should create the output directory if it does not exist', () => {
            const rootFile = set.root(fixture, 'main.tex')
            const relativeOutDir = 'output'
            const expectedOutDir = path.resolve(path.dirname(rootFile), relativeOutDir)

            getOutDirStub.returns(relativeOutDir)
            getIncludedTeXStub.returns([rootFile])
            const existsStub = sinon.stub(lw.external, 'existsSync').returns(false)
            const statStub = sinon.stub(lw.external, 'statSync').returns(fs.statSync(get.path(fixture)))
            const mkdirStub = sinon.stub(lw.external, 'mkdirSync').returns(undefined)

            recipe.createOutputSubFolders(rootFile)
            existsStub.restore()
            statStub.restore()
            mkdirStub.restore()

            assert.pathStrictEqual(mkdirStub.getCalls()[0].args[0].toString(), expectedOutDir)
            assert.deepStrictEqual(mkdirStub.getCalls()[0].args[1], { recursive: true })
        })

        it('should not create the output directory if it already exists', () => {
            const rootFile = set.root(fixture, 'main.tex')
            const relativeOutDir = 'output'

            getOutDirStub.returns(relativeOutDir)
            getIncludedTeXStub.returns([rootFile])
            const existsStub = sinon.stub(lw.external, 'existsSync').returns(true)
            const statStub = sinon.stub(lw.external, 'statSync').returns(fs.statSync(get.path(fixture)))
            const mkdirStub = sinon.stub(lw.external, 'mkdirSync').returns(undefined)

            recipe.createOutputSubFolders(rootFile)
            existsStub.restore()
            statStub.restore()
            mkdirStub.restore()

            recipe.createOutputSubFolders(rootFile)
            existsStub.restore()
            statStub.restore()
            mkdirStub.restore()

            assert.ok(!mkdirStub.called)
        })
    })

    describe('lw.compile->recipe.findMagicComments', () => {
        let readStub: sinon.SinonStub

        before(() => {
            readStub = sinon.stub(lw.file, 'read')
        })

        afterEach(() => {
            readStub.reset()
        })

        after(() => {
            readStub.restore()
        })

        it('should return an empty object if there are no magic comments', async () => {
            readStub.resolves('Some regular content\nwith no magic comments')

            const result = await recipe.findMagicComments('dummy.tex')

            assert.deepStrictEqual(result, { tex: undefined, bib: undefined, recipe: undefined })
        })

        it('should detect only TeX magic comment', async () => {
            readStub.resolves('% !TEX program = pdfdev\n')

            const result = await recipe.findMagicComments('dummy.tex')

            assert.deepStrictEqual(result, {
                tex: { name: lw.constant.TEX_MAGIC_PROGRAM_NAME, command: 'pdfdev' },
                bib: undefined,
                recipe: undefined,
            })
        })

        it('should detect TeX magic comment with options', async () => {
            readStub.resolves('% !TEX program = pdfdev\n% !TEX options = --shell-escape\n')

            const result = await recipe.findMagicComments('dummy.tex')

            assert.deepStrictEqual(result, {
                tex: { name: lw.constant.TEX_MAGIC_PROGRAM_NAME, command: 'pdfdev', args: ['--shell-escape'] },
                bib: undefined,
                recipe: undefined,
            })
        })

        it('should detect only BIB magic comment', async () => {
            readStub.resolves('% !BIB program = bibtex\n')

            const result = await recipe.findMagicComments('dummy.tex')

            assert.deepStrictEqual(result, {
                tex: undefined,
                bib: { name: lw.constant.BIB_MAGIC_PROGRAM_NAME, command: 'bibtex' },
                recipe: undefined,
            })
        })

        it('should detect BIB magic comment with options', async () => {
            readStub.resolves('% !BIB program = bibtex\n% !BIB options = --min-crossrefs=100\n')

            const result = await recipe.findMagicComments('dummy.tex')

            assert.deepStrictEqual(result, {
                tex: undefined,
                bib: { name: lw.constant.BIB_MAGIC_PROGRAM_NAME, command: 'bibtex', args: ['--min-crossrefs=100'] },
                recipe: undefined,
            })
        })

        it('should detect only LW recipe comment', async () => {
            readStub.resolves('% !LW recipe = default\n')

            const result = await recipe.findMagicComments('dummy.tex')

            assert.deepStrictEqual(result, {
                tex: undefined,
                bib: undefined,
                recipe: 'default',
            })
        })

        it('should detect all magic comments', async () => {
            readStub.resolves(
                '% !TEX program = xedev\n' +
                    '% !TEX options = -interaction=nonstopmode\n' +
                    '% !BIB program = biber\n' +
                    '% !BIB options = --debug\n' +
                    '% !LW recipe = customRecipe'
            )

            const result = await recipe.findMagicComments('dummy.tex')

            assert.deepStrictEqual(result, {
                tex: {
                    name: lw.constant.TEX_MAGIC_PROGRAM_NAME,
                    command: 'xedev',
                    args: ['-interaction=nonstopmode'],
                },
                bib: {
                    name: lw.constant.BIB_MAGIC_PROGRAM_NAME,
                    command: 'biber',
                    args: ['--debug'],
                },
                recipe: 'customRecipe',
            })
        })

        it('should ignore non-magic comments', async () => {
            readStub.resolves('This is a regular line\n% !TEX program = luadev')

            const result = await recipe.findMagicComments('dummy.tex')

            assert.deepStrictEqual(result, {
                tex: undefined,
                bib: undefined,
                recipe: undefined,
            })
        })

        it('should stop reading after encountering non-comment lines', async () => {
            readStub.resolves(
                '% !TEX program = pdfdev\n' +
                    'This is not a comment and should stop further reading\n' +
                    '% !BIB program = bibtex'
            )

            const result = await recipe.findMagicComments('dummy.tex')

            assert.deepStrictEqual(result, {
                tex: { name: lw.constant.TEX_MAGIC_PROGRAM_NAME, command: 'pdfdev' },
                bib: undefined,
                recipe: undefined,
            })
        })
    })

    describe('lw.compile->recipe.createBuildMagic', () => {
        it('should set magicTex.args and magicTex.name if magicTex.args is undefined and magicBib is undefined', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('dev.magic.args', ['--shell-escape'])

            let tool: Tool = {
                command: 'pdfdev',
                args: undefined,
                name: 'TeXTool',
            }
            tool = recipe.createBuildMagic(rootFile, tool)[0]

            assert.strictEqual(tool.name, lw.constant.TEX_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.listStrictEqual(tool.args, ['--shell-escape'])
        })

        it('should set magicTex.args, magicTex.name, magicBib.args, and magicBib.name when magicBib is provided and both args are undefined', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('dev.magic.args', ['--shell-escape'])
            await set.config('dev.magic.bib.args', ['--min-crossrefs=1000'])

            let texTool: Tool = {
                command: 'pdfdev',
                args: undefined,
                name: 'TeXTool',
            }
            let bibTool: Tool = {
                command: 'bibtex',
                args: undefined,
                name: 'BibTool',
            }

            const result = recipe.createBuildMagic(rootFile, texTool, bibTool)
            texTool = result[0]
            bibTool = result[1]

            assert.strictEqual(texTool.name, lw.constant.TEX_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.listStrictEqual(texTool.args, ['--shell-escape'])
            assert.strictEqual(bibTool.name, lw.constant.BIB_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.listStrictEqual(bibTool.args, ['--min-crossrefs=1000'])
        })

        it('should not overwrite magicTex.args if it is already defined, even when magicBib is provided and magicBib.args is undefined', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('dev.magic.args', ['--shell-escape'])
            await set.config('dev.magic.bib.args', ['--min-crossrefs=1000'])

            let texTool: Tool = {
                command: 'pdfdev',
                args: ['-interaction=nonstopmode'],
                name: 'TeXTool',
            }
            let bibTool: Tool = {
                command: 'bibtex',
                args: undefined,
                name: 'BibTool',
            }

            const result = recipe.createBuildMagic(rootFile, texTool, bibTool)
            texTool = result[0]
            bibTool = result[1]

            assert.strictEqual(texTool.name, 'TeXTool')
            assert.listStrictEqual(texTool.args, ['-interaction=nonstopmode'])
            assert.strictEqual(bibTool.name, lw.constant.BIB_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.listStrictEqual(bibTool.args, ['--min-crossrefs=1000'])
        })

        it('should not overwrite magicTex.args and magicBib.args if both are already defined', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('dev.magic.args', ['--shell-escape'])
            await set.config('dev.magic.bib.args', ['--min-crossrefs=1000'])

            let texTool: Tool = {
                command: 'pdfdev',
                args: ['-interaction=nonstopmode'],
                name: 'TeXTool',
            }
            let bibTool: Tool = {
                command: 'bibtex',
                args: ['--min-crossrefs=2'],
                name: 'BibTool',
            }

            const result = recipe.createBuildMagic(rootFile, texTool, bibTool)
            texTool = result[0]
            bibTool = result[1]

            assert.strictEqual(texTool.name, 'TeXTool')
            assert.listStrictEqual(texTool.args, ['-interaction=nonstopmode'])
            assert.strictEqual(bibTool.name, 'BibTool')
            assert.listStrictEqual(bibTool.args, ['--min-crossrefs=2'])
        })
    })

    describe('lw.compile->recipe.findRecipe', () => {
        beforeEach(() => {
            recipe.state.prevLangId = ''
            recipe.state.prevRecipe = undefined
        })

        it('should return undefined and log an error if no recipes are defined', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('dev.recipes', [])

            const result = recipe.findRecipe(rootFile, 'dev')

            assert.strictEqual(result, undefined)
            assert.ok(has.log('No recipes defined.'))
        })

        it('should reset prevRecipe if the language ID changes', async () => {
            recipe.state.prevLangId = 'oldLangId'
            await set.config('dev.recipes', [{ name: 'recipe1' }])
            await set.config('dev.recipe.default', 'recipe1')

            recipe.findRecipe('root.tex', 'newLangId')

            assert.strictEqual(recipe.state.prevRecipe, undefined)
        })

        it('should use the default recipe name if recipeName is undefined', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('dev.recipes', [{ name: 'recipe1' }])
            await set.config('dev.recipe.default', 'recipe1')

            const result = recipe.findRecipe(rootFile, 'dev')

            assert.deepStrictEqual(result, { name: 'recipe1' })
        })

        it('should log an error and return undefined if the specified recipe is not found', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('dev.recipes', [{ name: 'recipe1' }])

            recipe.findRecipe(rootFile, 'dev', 'nonExistentRecipe')

            assert.ok(has.log('Failed to resolve build recipe'))
        })

        it('should return the last used recipe if defaultRecipeName is lastUsed', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('dev.recipes', [{ name: 'recipe1' }, { name: 'lastUsedRecipe' }])
            await set.config('dev.recipe.default', 'lastUsed')
            recipe.state.prevLangId = 'dev'
            recipe.state.prevRecipe = { name: 'lastUsedRecipe', tools: [] }

            const result = recipe.findRecipe(rootFile, 'dev')

            assert.deepStrictEqual(result, { name: 'lastUsedRecipe', tools: [] })
        })

        it('should return the first matching recipe based on langId if no recipe is found', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('dev.recipes', [
                { name: 'recipe1' },
                { name: 'rsweave Recipe' },
                { name: 'weave.jl Recipe' },
                { name: 'pweave Recipe' },
            ])
            await set.config('dev.recipe.default', 'first')

            let result = recipe.findRecipe(rootFile, 'rsweave')
            assert.deepStrictEqual(result, { name: 'rsweave Recipe' })

            result = recipe.findRecipe(rootFile, 'jlweave')
            assert.deepStrictEqual(result, { name: 'weave.jl Recipe' })

            result = recipe.findRecipe(rootFile, 'pweave')
            assert.deepStrictEqual(result, { name: 'pweave Recipe' })
        })

        it('should log an error and return undefined if no matching recipe is found for the specific langId', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('dev.recipes', [{ name: 'recipe1' }])

            const result = recipe.findRecipe(rootFile, 'rsweave')

            assert.strictEqual(result, undefined)
            assert.ok(has.log('Failed to resolve build recipe: undefined.'))
        })

        it('should return the first recipe if no other recipe matches', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('dev.recipes', [{ name: 'recipe1' }, { name: 'recipe2' }])
            await set.config('dev.recipe.default', 'first')

            const result = recipe.findRecipe(rootFile, 'dev')

            sinon.assert.match(result, { name: 'recipe1' })
        })
    })

    describe('lw.compile->recipe.populateTools', () => {
        let readStub: sinon.SinonStub
        let platform: PropertyDescriptor | undefined
        let extRoot: string

        const setPlatform = (newPlatform: NodeJS.Platform) => {
            Object.defineProperty(process, 'platform', { value: newPlatform })
        }

        before(() => {
            readStub = sinon.stub(lw.file, 'read')
            platform = Object.getOwnPropertyDescriptor(process, 'platform')
            extRoot = lw.extensionRoot
        })

        afterEach(() => {
            readStub.reset()
            if (platform !== undefined) {
                Object.defineProperty(process, 'platform', platform)
            }
            lw.extensionRoot = extRoot
            recipe.state.isMikTeX = undefined
        })

        after(() => {
            readStub.restore()
        })

        it('should modify command when Docker is enabled on Windows', async () => {
            const tools: Tool[] = [{ name: 'devmk', command: 'devmk', args: [], env: {} }]
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('docker.enabled', true)

            setPlatform('win32')
            lw.extensionRoot = '/path/to/extension'

            const result = recipe.populateTools(rootFile, tools)

            assert.strictEqual(result[0].command, path.resolve('/path/to/extension', './scripts/devmk.bat'))
        })

        it('should modify command and chmod when Docker is enabled on non-Windows', async () => {
            const tools: Tool[] = [{ name: 'devmk', command: 'devmk', args: [], env: {} }]
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('docker.enabled', true)

            setPlatform('linux')
            lw.extensionRoot = '/path/to/extension'
            const stub = sinon.stub(lw.external, 'chmodSync')
            const result = recipe.populateTools(rootFile, tools)
            stub.restore()

            assert.strictEqual(result[0].command, path.resolve('/path/to/extension', './scripts/devmk'))
            assert.listStrictEqual(stub.getCall(0).args, [result[0].command, 0o755])
        })

        it('should not modify command when Docker is disabled', async () => {
            const tools: Tool[] = [{ name: 'devmk', command: 'devmk', args: [], env: {} }]
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('docker.enabled', false)

            const result = recipe.populateTools(rootFile, tools)

            assert.strictEqual(result[0].command, 'devmk')
        })

        it('should replace argument placeholders', () => {
            const tools: Tool[] = [{ name: 'devmk', command: 'devmk', args: ['%DOC%', '%DOC%', '%DIR%'], env: {} }]
            const rootFile = set.root(fixture, 'main.tex')

            const result = recipe.populateTools(rootFile, tools)

            assert.pathStrictEqual(result[0].args?.[0], rootFile.replace('.tex', ''))
            assert.pathStrictEqual(result[0].args?.[1], rootFile.replace('.tex', ''))
            assert.pathStrictEqual(result[0].args?.[2], get.path(fixture))
        })

        it('should set TeX directories correctly', () => {
            const tools: Tool[] = [
                {
                    name: 'devmk',
                    command: 'devmk',
                    args: ['-out-directory=out', '-aux-directory=aux'],
                    env: {},
                },
            ]
            const rootFile = set.root(fixture, 'main.tex')

            const stub = sinon.stub(lw.file, 'setTeXDirs')
            recipe.populateTools(rootFile, tools)
            stub.restore()

            assert.listStrictEqual(stub.getCall(0).args, [rootFile, 'out', 'aux'])
        })

        it('should process environment variables correctly', () => {
            const tools: Tool[] = [
                {
                    name: 'devmk',
                    command: 'devmk',
                    args: [],
                    env: { DOC: '%DOC%' },
                },
            ]
            const rootFile = set.root(fixture, 'main.tex')

            const result = recipe.populateTools(rootFile, tools)

            assert.pathStrictEqual(result[0].env?.['DOC'], rootFile.replace('.tex', ''))
        })

        it('should append max print line arguments when enabled', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('dev.option.maxPrintLine.enabled', true)
            recipe.state.isMikTeX = true

            let result = recipe.populateTools(rootFile, [{ name: 'devmk', command: 'devmk', args: [], env: {} }])
            assert.ok(result[0].args?.includes('--max-print-line=' + lw.constant.MAX_PRINT_LINE))

            result = recipe.populateTools(rootFile, [{ name: 'pdfdev', command: 'pdfdev', args: [], env: {} }])
            assert.ok(result[0].args?.includes('--max-print-line=' + lw.constant.MAX_PRINT_LINE))

            result = recipe.populateTools(rootFile, [
                { name: 'devmk', command: 'devmk', args: ['-luadev'], env: {} },
            ])
            assert.listStrictEqual(result[0].args, ['-luadev'])
        })
    })

    describe('lw.compile->recipe.isMikTeX', () => {
        let syncStub: Sinon.SinonStub

        before(() => {
            syncStub = sinon.stub(lw.external, 'sync')
        })

        afterEach(() => {
            syncStub.reset()
            recipe.state.isMikTeX = undefined
        })

        after(() => {
            syncStub.restore()
        })

        it('should return true when pdfdev is provided by MiKTeX', () => {
            syncStub.returns('pdfTeX 3.14159265-2.6-1.40.21 (MiKTeX 2.9.7350 64-bit)')

            const result = recipe.isMikTeX()

            assert.ok(result)
            assert.strictEqual(syncStub.callCount, 1)
        })

        it('should return false when pdfdev is not provided by MiKTeX', () => {
            syncStub.returns('pdfTeX 3.14159265-2.6-1.40.21 (TeX Live 2020)')

            const result = recipe.isMikTeX()

            assert.ok(!result)
            assert.strictEqual(syncStub.callCount, 1)
        })

        it('should return false when pdfdev command fails', () => {
            syncStub.throws(new Error('Command failed'))

            const result = recipe.isMikTeX()

            assert.ok(!result)
            assert.strictEqual(syncStub.callCount, 1)
            assert.ok(has.log('Cannot run `pdfdev` to determine if we are using MiKTeX.'))
        })

        it('should return cached value if state.isMikTeX is already defined', () => {
            recipe.state.isMikTeX = true

            const result = recipe.isMikTeX()

            assert.ok(result)
            assert.strictEqual(syncStub.callCount, 0)
        })
    })

    describe('lw.compile->recipe.createBuildTools', () => {
        it('should return undefined if no recipe is found', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('dev.recipes', [])

            const result = await recipe.createBuildTools(rootFile, 'dev')

            assert.strictEqual(result, undefined)
        })

        it('should create build tools based on magic comments when enabled', async () => {
            const rootFile = set.root(fixture, 'magic.tex')
            await set.config('dev.recipes', [])
            await set.config('dev.build.forceRecipeUsage', false)
            await set.config('dev.magic.args', ['--shell-escape'])

            const result = await recipe.createBuildTools(rootFile, 'dev')

            assert.deepStrictEqual(result, [
                {
                    name: lw.constant.TEX_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX,
                    command: 'pdfdev',
                    args: ['--shell-escape'],
                },
            ])
        })

        it('should return undefined with magic comments but disabled', async () => {
            const rootFile = set.root(fixture, 'magic.tex')
            await set.config('dev.recipes', [])
            await set.config('dev.build.forceRecipeUsage', true)

            const result = await recipe.createBuildTools(rootFile, 'dev')

            assert.strictEqual(result, undefined)
        })

        it('should skip undefined tools in the recipe and log an error', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('dev.tools', [{ name: 'existingTool', command: 'pdfdev' }])
            await set.config('dev.recipes', [{ name: 'Recipe1', tools: ['nonexistentTool', 'existingTool'] }])

            const result = await recipe.createBuildTools(rootFile, 'dev')

            assert.deepStrictEqual(result, [{ name: 'existingTool', command: 'pdfdev', args: [] }])
            assert.ok(has.log('Skipping undefined tool nonexistentTool in recipe Recipe1.'))
        })

        it('should return undefined if no tools are prepared', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('dev.tools', [])
            await set.config('dev.recipes', [{ name: 'Recipe1', tools: ['nonexistentTool'] }])

            const result = await recipe.createBuildTools(rootFile, 'dev')

            assert.strictEqual(result, undefined)
        })
    })

    describe('lw.compile->recipe.build', () => {
        let getOutDirStub: sinon.SinonStub
        let getIncludedTeXStub: sinon.SinonStub
        let saveAllStub: sinon.SinonStub

        before(() => {
            getOutDirStub = sinon.stub(lw.file, 'getOutDir')
            getIncludedTeXStub = lw.cache.getIncludedTeX as sinon.SinonStub
            saveAllStub = sinon.stub(vscode.workspace, 'saveAll') as sinon.SinonStub
        })

        afterEach(() => {
            getOutDirStub.reset()
            getIncludedTeXStub.reset()
            saveAllStub.reset()
            lw.root.subfiles.path = undefined
            lw.compile.compiledPDFPath = ''
        })

        after(() => {
            getOutDirStub.restore()
        })

        it('should save all open files in the workspace', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            getIncludedTeXStub.returns([rootFile])
            getOutDirStub.returns('.')

            await recipe.build(rootFile, 'dev', async () => {})

            assert.ok(saveAllStub.calledOnce)
        })

        it('should call `createOutputSubFolders` with correct args', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            const subPath = get.path(fixture, 'sub', 'main.tex')
            await set.config('dev.tools', [{ name: 'devmk', command: 'devmk' }])
            await set.config('dev.recipes', [{ name: 'Recipe1', tools: ['devmk'] }])
            lw.root.subfiles.path = subPath
            getIncludedTeXStub.returns([rootFile, subPath])
            getOutDirStub.returns('.')

            await recipe.build(rootFile, 'dev', async () => {})
            assert.ok(has.log(`outDir: ${path.dirname(rootFile)} .`))
        })

        it('should call `createOutputSubFolders` with correct args with subfiles package', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            const subPath = get.path(fixture, 'sub', 'main.tex')
            await set.config('dev.tools', [{ name: 'devmk', command: 'devmk' }])
            await set.config('dev.recipes', [{ name: 'Recipe1', tools: ['devmk'] }])
            lw.root.subfiles.path = subPath
            getIncludedTeXStub.returns([rootFile, subPath])
            getOutDirStub.returns('.')

            await recipe.build(subPath, 'dev', async () => {})
            assert.ok(has.log(`outDir: ${path.dirname(rootFile)} .`))
        })

        it('should not call buildLoop if no tool is created', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('dev.tools', [])
            await set.config('dev.recipes', [{ name: 'Recipe1', tools: ['nonexistentTool'] }])
            getIncludedTeXStub.returns([rootFile])
            getOutDirStub.returns('.')

            const stub = sinon.stub()
            await recipe.build(rootFile, 'dev', stub)

            assert.strictEqual(stub.callCount, 0)
        })

        it('should set lw.compile.compiledPDFPath', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('dev.tools', [{ name: 'devmk', command: 'devmk' }])
            await set.config('dev.recipes', [{ name: 'Recipe1', tools: ['devmk'] }])
            getIncludedTeXStub.returns([rootFile])
            getOutDirStub.returns('.')

            await recipe.build(rootFile, 'dev', async () => {})

            assert.strictEqual(lw.compile.compiledPDFPath, rootFile.replace('.tex', '.pdf'))
        })
    })
})
