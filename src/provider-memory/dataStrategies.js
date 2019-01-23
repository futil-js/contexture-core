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

let getTreeResults = Tree.lookup(['analysisOutput'])
let analysisTree = _.curry((analysisNodes, tree) => ({
  key: 'analysisRoot',
  type: 'group',
  join: 'and',
  schema: tree.schema,
  children: [setFilterOnly(tree), ..._.castArray(analysisNodes)],
}))

let executeAnalysis = _.curry(async (service, analysisNodes, tree) =>
  getTreeResults(await service(analysisTree(analysisNodes, tree)))
)

let facet = ({ service, tree, field, size = 100, sortDir }) => {
  let getTotalRecords = _.memoize(async () => {
    let result = await executeAnalysis(
      service,
      {
        key: 'analysisOutput',
        type: 'cardinality',
        field,
      },
      tree
    )
    return _.get('context.value', result)
  })

  let done = false
  let getNext = async () => {
    let result = await executeAnalysis(
      service,
      {
        key: 'analysisOutput',
        type: 'facet',
        field,
        size,
        sortDir,
      },
      tree
    )
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
  executeAnalysis,
}
