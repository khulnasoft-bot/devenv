import { lint as devLinter } from './dev-linter'
import { formatter as devFormatter } from './dev-formatter'
import { provider as devActionProvider, action as devAction } from './dev-code-actions'
import { format as bibtexFormat, formatter as bibtexFormatter } from './bibtex-formatter'
import { dupLabelDetector } from './duplicate-label'

export const lint = {
    dev: {
        formatter: devFormatter,
        actionprovider: devActionProvider,
        action: devAction,
        ...devLinter
    },
    bibtex: {
        format: bibtexFormat,
        formatter: bibtexFormatter
    },
    label: dupLabelDetector
}
