let F = require('futil-js')
let _ = require('lodash/fp')
let Promise = require('bluebird')
let utils = require('./utils')

let overAsync = fns =>
  _.flow(
    _.over(fns),
    Promise.all
  )
let extendAllOn = _.extendAll.convert({ immutable: false })
let { getChildren, parentFirstDFS, getRelevantFilters } = utils

let materializePaths = (item, parent) => {
  item._meta.path = _.getOr([], '_meta.path', parent).concat([item.key])
}
let initNode = (item, { schema } = {}) =>
  F.defaultsOn({ _meta: { requests: [] }, schema }, item)

let flattenLegacyFields = item => extendAllOn([item, item.config, item.data])

let walkAsync = tree => f => parentFirstDFS(getChildren, f, tree)
let process = _.curryN(
  2,
  async ({ providers, schemas }, groupParam, options = {}) => {
    let getProvider = utils.getProvider(providers, schemas)
    let getSchema = schema => schemas[schema]
    let runTypeFunction = utils.runTypeFunction({
      options,
      getSchema,
      getProvider,
      processGroup: (g, options) => process({ providers, schemas }, g, options),
    })
    let group = _.cloneDeep(groupParam)
    let walk = walkAsync(group)
    try {
      await walk(
        // Do all of these in the same traversal
        overAsync([
          initNode,
          flattenLegacyFields,
          materializePaths,
          async item => {
            item._meta.hasValue = await runTypeFunction('hasValue', item)
            if (item._meta.hasValue && !item.contextOnly) {
              item._meta.filter = await runTypeFunction('filter', item)
            }
          },
        ])
      )
      await walk(item => {
        // Skip groups
        if (!getChildren(item))
          item._meta.relevantFilters = getRelevantFilters(
            getProvider(item).groupCombinator,
            item._meta.path,
            group
          )
      })
      await walk(async item => {
        let validContext = await runTypeFunction('validContext', item)

        // Reject filterOnly
        if (item.filterOnly || !validContext) return

        let curriedSearch = _.partial(getProvider(item).runSearch, [
          options,
          item,
          getSchema(item.schema),
          item._meta.relevantFilters,
        ])

        let result = await runTypeFunction('result', item, curriedSearch).catch(
          error => {
            throw F.extendOn(error, { item })
          }
        )
        item.context = result
        if (options.onResult) options.onResult(result)
      })
      await walk(item => {
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
