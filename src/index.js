var _ = require('lodash/fp')
var Promise = require('bluebird')
var utils = require('./utils')

var parentFirstDFS = utils.parentFirstDFS
var getItems = utils.getItems
var getRelevantFilters = utils.getRelevantFilters

var materializePaths = function(item, parent) {
  item._meta.path = _.getOr([], '_meta.path', parent).concat([item.key])
}
var makeObjectsSafe = (item, parent) =>
  _.defaults(
    {
      data: {},
      config: {},
      _meta: {
        requests: [],
      },
      // Stamp Schemas
      schema: parent && parent.schema,
    },
    item
  )

var runTypeProcessor = _.curry((getProvider, processor, item, ...args) =>
  Promise.try(() => {
    var types = getProvider(item).types
    var defaultFn = _.get(`default.${processor}`, types) || _.noop
    var fn = _.get(`${item.type}.${processor}`, types) || defaultFn
    return Promise.resolve(fn(...[item, ...args]))
  }).catch(error => {
    throw new Error(
      `Failed running search for ${item.type} (${item.key}) at ${processor}: ${error}`
    )
  })
)

module.exports = _.curryN(2, function(
  { providers, schemas },
  groupParam,
  options = {}
) {
  var getProvider = utils.getProvider(providers, schemas)
  var runProcessor = runTypeProcessor(getProvider)
  var getSchema = schema => schemas[schema]
  var group = _.cloneDeep(groupParam)
  var processStep = f => parentFirstDFS(getItems, f, group)
  return processStep([
    makeObjectsSafe,
    materializePaths,
    item =>
      runProcessor('hasValue', item).then(hasValue => {
        item._meta.hasValue = hasValue
        if (hasValue && !item.contextOnly) {
          return runProcessor('filter', item).then(f => {
            item._meta.filter = f
          })
        }
      }),
  ])
    .then(() =>
      processStep(item => {
        // Skip groups
        if (!getItems(item))
          item._meta.relevantFilters = getRelevantFilters(
            getProvider(item).groupCombinator,
            item._meta.path,
            group
          )
      })
    )
    .then(() =>
      processStep(item =>
        runProcessor('validContext', item)
          .then(validContext => {
            // Reject filterOnly
            if (item.filterOnly || !validContext) return

            var schema = getSchema(item.schema)
            var curriedSearch = _.partial(getProvider(item).runSearch, [
              options,
              item,
              schema,
              item._meta.relevantFilters,
            ])
            return runProcessor(
              'result',
              item,
              curriedSearch,
              schema,
              getProvider(item),
              options
            ).catch(error => {
              throw _.extend(error, {
                item,
              })
            })
          })
          .then(result => {
            item.context = _.defaults(result, {
              took: _.sum(_.map('response.took', item._meta.requests)),
            })
            if (options.onResult) options.onResult(result)
          })
      )
    )
    .then(() =>
      processStep(item => {
        if (!options.debug) delete item._meta
      })
    )
    .return(group)
    .catch(error => {
      throw error.item
        ? error
        : new Error(`Failed running search (uncaught): ${error}`)
    })
  // .then(() => {
  //     console.log('------------')
  //     console.log(JSON.stringify(group, null, 2))
  // })
})

// Psuedo code process
// -----
// add _meta
// add materializedPaths
// add filter (reject !hasValue, reject contextOnly)
// iterate DFS
//   get filters for context (by materialized path, filter lookup)
//   reject filterOnly
//   add resultProcessor (aka `query`)
//     SEARCH
//     process result, loop ^
//   onResult
// return results
