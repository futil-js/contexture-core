let strategies = require('./dataStrategies')

module.exports = ({ getSavedSearch } = {}) => ({
  savedSearch: {
    async filter(node, schema, { processGroup }) {
      let debugSearch = x => processGroup(x, { debug: true })
      let search = node.search || (await getSavedSearch(node.searchId))
      let result = await strategies.analyzeTree(debugSearch, search, {
        key: 'targetNode',
      })
      return result._meta.relevantFilters
    },
  },
  subquery: {
    filter: async (node, schema, { processGroup, getProvider }) =>
      getProvider(node).types.facet.filter({
        field: node.localField,
        values: await strategies
          .facet({
            service: processGroup,
            tree: node.search || (await getSavedSearch(node.searchId)),
            field: node.foreignField,
            size: 0 // get all results
          })
          .getNext(),
      }),
  },
})
