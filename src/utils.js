let _ = require('lodash/fp')
let Promise = require('bluebird')
let F = require('futil-js')

// Parent first promise DFS
// TODO: futil walkAsync
let parentFirstDFS = function(getChildren, fn, collection, parent) {
  let fns = _.castArray(fn)
  return Promise.map(fns, f => f(collection, parent)).then(() =>
    Promise.map(getChildren(collection) || [], item =>
      parentFirstDFS(getChildren, fns, item, collection)
    )
  )
}

// TODO: Handle no provider and have global default?
let getProvider = _.curry((providers, schemas, item) => {
  let providerKeys = _.keys(providers)
  let schemaFields = _.keys(schemas[item.schema])
  let provider =
    item.provider || _.find(_.includes(_, providerKeys), schemaFields)
  let result = providers[provider]
  if (!result)
    throw new Error(
      `No Provider found ${item.schema} and was not overridden for ${item.key}`
    )
  return result
})

let getItems = F.cascade(['items', 'data.items'])
let getRelevantFilters = _.curry((groupCombinator, Path, group) => {
  if (!_.includes(group.key, Path))
    // If we're not in the path, it doesn't matter what the rest of it is
    Path = []

  let path = Path.slice(1) // pop off this level
  let currentKey = path[0]

  let relevantChildren = getItems(group)
  // Pull .filter if it's a DC
  if (!relevantChildren) return group._meta.filter
  // Exclude sibling criteria in OR groups where the group is in the paths (meaning only exclude ORs that are in relation via path)
  if (group.join == 'or' && currentKey)
    relevantChildren = _.filter(
      {
        key: currentKey,
      },
      relevantChildren
    )
  // Exclude self
  relevantChildren = _.reject(
    item => item.key == currentKey && !getItems(item),
    relevantChildren
  )

  let relevantFilters = _.compact(
    _.map(getRelevantFilters(groupCombinator, path), relevantChildren)
  )
  if (!relevantFilters.length) return
  if (relevantFilters.length == 1 && group.join !== 'not')
    return relevantFilters[0]

  return groupCombinator(group, _.compact(relevantFilters))
})

module.exports = {
  parentFirstDFS,
  getProvider,
  getItems,
  getRelevantFilters,
}
