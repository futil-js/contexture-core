import F from 'futil'
import _ from 'lodash/fp.js'
import {
  Tree,
  getRelevantFilters,
  attachFilters,
  getProvider as getProviderUtil,
  runTypeFunction as runTypeFunctionUtil,
} from './utils.js'

let process = _.curry(async ({ providers, schemas }, group, options = {}) => {
  let getProvider = getProviderUtil(providers, schemas)
  let getSchema = (schema) => schemas[schema]
  let runTypeFunction = runTypeFunctionUtil({
    options,
    getSchema,
    getProvider,
    processGroup: (g, options) => process({ providers, schemas }, g, options),
  })
  try {
    await attachFilters(runTypeFunction)(group)
    Tree.walk((node) => {
      // Skip groups
      if (!Tree.traverse(node))
        node._meta.relevantFilters = getRelevantFilters(
          getProvider(node).groupCombinator,
          node._meta.path,
          group
        )
    })(group)
    await Tree.walkAsync(async (node) => {
      let validContext = await runTypeFunction('validContext', node)

      // Reject filterOnly
      if (node.filterOnly || !validContext) {
        if (!options.debug) delete node._meta
        return
      }
      let curriedSearch = _.partial(getProvider(node).runSearch, [
        options,
        node,
        getSchema(node.schema),
        node._meta.relevantFilters,
      ])

      node.context = await runTypeFunction('result', node, curriedSearch).catch(
        (error) => {
          throw F.extendOn(error, { node })
        }
      )
      let path = node._meta.path
      if (!options.debug) delete node._meta
      if (options.onResult) options.onResult({ path, node })
    })(group)

    return group
  } catch (error) {
    throw error.node ? error : new Error(`Uncaught search exception: ${error}`)
  }
})

export default process

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
