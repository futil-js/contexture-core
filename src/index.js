let Promise = require('bluebird')
let F = require('futil-js')
let _ = require('lodash/fp')
let utils = require('./utils')

let getChildren = utils.getChildren
let parentFirstDFS = utils.parentFirstDFS
let getRelevantFilters = utils.getRelevantFilters

let materializePaths = (item, parent) => {
  item._meta.path = _.getOr([], '_meta.path', parent).concat([item.key])
}
let makeObjectsSafe = (item, parent) =>
  F.defaultsOn(
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

let extendAllOn = _.extendAll.convert({ immutable: false })
let flattenLegacyFields = item =>
  extendAllOn([
    item,
    item.config,
    item.filterConfig,
    item.data,
    item.resultConfig,
  ])

let runTypeProcessor = _.curry(
  async (getProvider, processor, item, ...args) => {
    try {
      return await (F.cascade(
        [`${item.type}.${processor}`, `default.${processor}`],
        getProvider(item).types
      ) || _.noop)(item, ...args)
    } catch (error) {
      throw new Error(
        `Failed running search for ${item.type} (${
          item.key
        }) at ${processor}: ${error}`
      )
    }
  }
)

let process = _.curryN(
  2,
  async ({ providers, schemas }, groupParam, options = {}) => {
    let getProvider = utils.getProvider(providers, schemas)
    let runProcessor = runTypeProcessor(getProvider)
    let getSchema = schema => schemas[schema]
    let group = _.cloneDeep(groupParam)
    let processStep = f => parentFirstDFS(getChildren, f, group)
    try {
      await processStep(_.flow(_.over([
        makeObjectsSafe,
        flattenLegacyFields,
        materializePaths,
        async item => {
          let schema = getSchema(item.schema)
          let hasValue = await runProcessor('hasValue', item, schema)
          item._meta.hasValue = hasValue
          if (hasValue && !item.contextOnly) {
            item._meta.filter = await runProcessor('filter', item, schema)
          }
        },
      ]), Promise.all))
      await processStep(item => {
        // Skip groups
        if (!getChildren(item))
          item._meta.relevantFilters = getRelevantFilters(
            getProvider(item).groupCombinator,
            item._meta.path,
            group
          )
      })
      await processStep(async item => {
        let schema = getSchema(item.schema)
        let validContext = await runProcessor('validContext', item, schema)

        // Reject filterOnly
        if (item.filterOnly || !validContext) return

        let curriedSearch = _.partial(getProvider(item).runSearch, [
          options,
          item,
          schema,
          item._meta.relevantFilters,
        ])

        let result = await runProcessor(
          'result',
          item,
          curriedSearch,
          schema,
          { getProvider, getSchema },
          options
        ).catch(error => {
          throw F.extendOn(error, {
            item,
          })
        })
        item.context = result
        if (options.onResult) options.onResult(result)
      })
      await processStep(item => {
        if (!options.debug) delete item._meta
      })

      return group
    } catch (error) {
      throw error.item
        ? error
        : new Error(`Failed running search (uncaught): ${error}`)
    }
  }
)
module.exports = process

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
