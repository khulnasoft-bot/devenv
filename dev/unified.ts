// Run npx esbuild unified.ts --bundle --outfile=../resources/unified.js
// Then change the `var unified2 = {` near EOF to `module.exports = {`

import { getParser } from '@unified-dev/unified-dev-util-parse'
import { attachMacroArgs } from '@unified-dev/unified-dev-util-arguments'
import { toString } from '@unified-dev/unified-dev-util-to-string'

export const unified = {
    getParser,
    attachMacroArgs,
    toString
}
