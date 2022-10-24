import _ from 'lodash/fp'
import * as strategies from './dataStrategies'

export default ({ getSavedSearch } = {}) => ({
  savedSearch: {
    hasValue: (node) => node.search || node.searchId,
    async filter(node, schema, { processGroup }) {
      let debugSearch = (x) => processGroup(x, { debug: true })
      let search = node.search || (await getSavedSearch(node.searchId))
      let result = await strategies.analyzeTree(debugSearch, search, {
        key: 'targetNode',
      })
      return result._meta.relevantFilters
    },
  },
  subquery: {
    hasValue: (node) =>
      node.localField && node.foreignField && (node.search || node.searchId),
    async filter(node, schema, { processGroup, getProvider, getSchema }) {
      let tree = node.search || (await getSavedSearch(node.searchId))
      return getProvider(node).types.facet.filter(
        {
          field: node.localField,
          values: await strategies
            .facet(
              {
                service: processGroup,
                tree,
                field: node.foreignField,
                size: 0, // get all results
              },
              getSchema(tree.schema)
            )
            .getNext(),
        },
        schema
      )
    },
  },
  raw: {
    hasValue: _.get('filter'),
    filter: ({ filter }) => filter,
    validContext: _.get('result'),
    result: async ({ result }, search) => ({ result: await search(result) }),
  },
})
