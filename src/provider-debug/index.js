let _ = require('lodash/fp')
let Promise = require('bluebird')

let DebugProvider = {
  groupCombinator: (group, filters) => ({
    [group.join]: filters,
  }),
  runSearch: function(options, context, schema, filters, aggs) {
    let request = {where: filters, retrieve: aggs}
    context._meta.requests.push(request)
    return Promise.resolve(request)
  },
  types: {
    default: {
      validContext: () => true,
      hasValue: () => true
    },
    test: {
      filter: x => ({[`${x.field || x.key} (${x.type})`]: x.data}),
      result: (context, search) =>
        search(null).return({
          abc: 123,
        }),
    },
    results: {
      result: (context, search) =>
        search({ results: context.config }).return({
          results: []
        })
    }
  },
}

module.exports = DebugProvider
