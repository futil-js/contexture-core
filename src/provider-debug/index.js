let _ = require('lodash/fp')

let DebugProvider = {
  groupCombinator: (group, filters) => ({
    [group.join]: filters,
  }),
  runSearch: function(context, schema, filters, aggs) {
    let request = _.defaults({}, filters, aggs)
    context._meta.requests.push(request)
    return Promise.resolve(request)
  },
  types: {
    default: {
      hasValue: () => true,
      filter: _.get('key'),
      result: (context, search) =>
        search(null).return({
          abc: 123,
        }),
    },
  },
}

module.exports = DebugProvider
