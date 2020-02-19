let F = require('futil')
let _ = require('lodash/fp')
let Promise = require('bluebird')
let utils = require('./utils')

let overAsync = fns => _.flow(_.over(fns), Promise.all)
let extendAllOn = _.extendAll.convert({ immutable: false })
let { getChildren, parentFirstDFS, getRelevantFilters } = utils

let materializePaths = (node, parent) => {
  node._meta.path = _.getOr([], '_meta.path', parent).concat([node.key])
}
let initNode = (node, { schema } = {}) =>
  F.defaultsOn({ _meta: { requests: [] }, schema }, node)

let flattenLegacyFields = node => extendAllOn([node, node.config, node.data])

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
          async node => {
            node._meta.hasValue = await runTypeFunction('hasValue', node)
            if (node._meta.hasValue && !node.contextOnly) {
              node._meta.filter = await runTypeFunction('filter', node)
            }
          },
        ])
      )
      await walk(node => {
        // Skip groups
        if (!getChildren(node))
          node._meta.relevantFilters = getRelevantFilters(
            getProvider(node).groupCombinator,
            node._meta.path,
            group
          )
      })
      await walk(async node => {
        let validContext = await runTypeFunction('validContext', node)

        // Reject filterOnly
        if (node.filterOnly || !validContext) return

        let curriedSearch = _.partial(getProvider(node).runSearch, [
          options,
          node,
          getSchema(node.schema),
          node._meta.relevantFilters,
        ])

        let result = await runTypeFunction('result', node, curriedSearch).catch(
          error => {
            throw F.extendOn(error, { node })
          }
        )
        node.context = result
        let path = node._meta.path
        if (!options.debug) delete node._meta
        if (options.onResult) options.onResult({ path, node })
      })
      
      return group
    } catch (error) {
      throw error.node
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
