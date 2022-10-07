/* global schedule */

let { danger, markdown, fail, message, warn } = require('danger')

let fs = require('fs')
let duti = require('duti')
let coverage = require('danger-plugin-coverage').default

let readJson = path => {
  try {
    return JSON.parse(fs.readFileSync(path, { encoding: 'utf8' }))
  } catch (e) {}
}

let args = {
  danger,
  fail,
  message,
  warn,
  markdown,
  lintResults: readJson('./lint-results.json'),
  testResults: readJson('./test-results.json'),
  config: {
    prNetChangeThreshold: 500,
    personalityNetChangeThreshold: 500,
    recommendedPrReviewers: 1,
    rootFolder: 'src',
  },
}

// Danger can do a run on a local repo via `danger local`, in which case
// `danger.github` will not be defined:
// - `danger local -h`
// - https://danger.systems/js/tutorials/fast-feedback.html
if (danger.github) {
  duti.prAssignee(args)
  duti.netNegativePR(args)
  duti.bigPr(args)
  duti.noPrDescription(args)
  duti.requestedReviewers(args)
  duti.emptyChangelog(args)
  duti.versionBump(args)
  duti.autoFix(args)
}

duti.hasLintWarnings(args)
duti.hasLintErrors(args)
duti.hasTestErrors(args)

schedule(
  coverage({
    showAllFiles: true,
    threshold: { statements: 0, branches: 0, functions: 0, lines: 0 },
  })
)
