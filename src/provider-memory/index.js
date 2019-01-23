let _ = require('lodash/fp')
let F = require('futil-js')

let MemoryProvider = {
  groupCombinator: (group, filters) =>
    ({
      and: _.overEvery,
      or: _.overSome,
      not: F.overNone,
    }[group.join || 'and'](filters)),
  runSearch: (options, node, schema, filters, aggs) =>
    _.flow(
      _.filter(filters),
      aggs
    )(schema.memory.records),
}

module.exports = MemoryProvider
