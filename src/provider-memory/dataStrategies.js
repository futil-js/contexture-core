// TODO: All of this should move to contexture-export

let _ = require('lodash/fp')
let F = require('futil-js')

let safeWalk = _.curry((Tree, f, tree) => {
  let result = _.cloneDeep(tree)
  Tree.walk(f)(result)
  return result
})

let Tree = F.tree(_.get('children'), key => ({ key }))
let setFilterOnly = safeWalk(Tree, node => {
  node.filterOnly = true
})
let lastChild = x => _.last(Tree.traverse(x))

let wrapTree = _.curry((analysisNodes, tree) => ({
  key: 'analysisRoot',
  type: 'group',
  join: 'and',
  schema: tree.schema,
  children: [setFilterOnly(tree), ..._.castArray(analysisNodes)],
}))


// this does too mauch so is poorly named
let analyzeTree = _.curry(async (service, tree, analysisNodes) =>
  lastChild(await service(wrapTree(analysisNodes, tree)))
)

let facet = ({ service, tree, field, size = 100, sortDir }) => {
  let analyze = analyzeTree(service, tree)
  let getTotalRecords = _.memoize(async () => {
    let result = await analyze({
      key: 'analysisOutput',
      type: 'cardinality',
      field,
    })
    return _.get('context.value', result)
  })

  let done = false
  let getNext = async () => {
    let result = await analyze({
      key: 'analysisOutput',
      type: 'facet',
      field,
      size,
      sortDir,
    })
    done = true
    return _.map('name', result.context.options)
  }

  return {
    getTotalRecords,
    hasNext: () => !done,
    getNext,
  }
}

module.exports = {
  facet,
  analyzeTree,
}
