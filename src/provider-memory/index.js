let _ = require('lodash/fp')
let F = require('futil-js')
let strategies = require('./dataStrategies')

// like `_.includes` but casts everything to string first
let toStringIncludes = _.curry((item, list) =>
  _.includes(_.toString(item), _.map(_.toString, list))
)

let MemoryProvider = {
  groupCombinator: (group, filters) =>
    ({
      and: _.overEvery,
      or: _.overSome,
      not: F.overNone,
    }[group.join || 'and'](filters)),
  runSearch: (options, node, schema, filters, aggs) =>
    _.flow(
      _.filter(filters),
      aggs
    )(schema.memory.records),
  types: {
    default: {
      validContext: () => true,
      hasValue: () => true,
    },
    number: {
      hasValue: node => F.isNotNil(node.min) || F.isNotNil(node.max),
      filter: ({ field, min = -Infinity, max = Infinity }) =>
        _.conforms({
          [field]: _.inRange(min, max),
        }),
    },
    date: {
      hasValue: node => F.isNotNil(node.from) || F.isNotNil(node.to),
      // Date math for rolling dates not supported yet
      filter: ({ field, from = -8640000000000000, to = 8640000000000000 }) =>
        _.conforms({
          [field]: _.inRange(new Date(from), new Date(to)),
        }),
    },
    exists: {
      filter: ({ field, value }) =>
        _.conforms({
          [field]: value ? F.isNotNil : _.isNil,
        }),
    },
    bool: {
      filter: ({ field, value }) =>
        _.conforms({
          [field]: value,
        }),
    },
    facet: {
      hasValue: node => _.size(node.values),
      filter: ({ field, values }) =>
        _.conforms({
          [field]: toStringIncludes(_, values),
        }),
      result({ field, size = 10 }, search) {
        let options = search(
          _.flow(
            _.filter(field), // TODO: handle "missing" - by default this would say "undefined" when missing
            _.countBy(field),
            _.toPairs,
            _.map(([name, count]) => ({ name, count })),
            _.orderBy('count', 'desc')
          )
        )
        return {
          cardinality: _.size(options),
          options: _.take(size, options),
        }
      },
    },
    text: {
      hasValue: node => node.value || _.size(node.values),
      filter({
        join = 'all',
        values,
        value,
        operator = 'containsWord',
        field,
      }) {
        let regexMap = (operator, val) =>
          ({
            containsWord: val,
            startsWith: `^${val}`,
            wordStartsWith: `\\b${val}`,
            endsWith: `${val}$`,
            wordEndsWith: `${val}\\b`,
            is: `^${val}$`,
            containsExact: `\\b${val}\\b`,
          }[operator])

        let conditions = _.map(
          nodeValue => recordValue =>
            RegExp(regexMap(operator, nodeValue), 'i').test(recordValue),
          values || [value]
        )

        let combinator = {
          all: _.overEvery,
          any: _.overSome,
          none: F.overNone,
        }[join]

        return _.conforms({
          [field]: combinator(conditions),
        })
      },
    },
    statistical: {
      result: ({ field }, search) => ({
        count: search(_.size),
        avg: search(_.meanBy(field)),
        max: search(_.maxBy(field)),
        min: search(_.minBy(field)),
        sum: search(_.sumBy(field)),
      }),
    },
    results: {
      result: (
        { pageSize = 10, page = 1, sortField, sortDir = 'desc' },
        search
      ) => ({
        results: search(
          _.flow(
            _.orderBy(sortField, sortDir),
            _.slice((page - 1) * pageSize, pageSize)
          )
        ),
      }),
    },
    savedSearch: {
      async filter(node, schema, { processGroup }) {
        let debugSearch = x => processGroup(x, { debug: true })
        let result = await strategies.analyzeTree(
          debugSearch,
          node.search,
          { key: 'targetNode' },
        )
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
              tree: node.search,
              field: node.foreignField,
              //size: 0 // <- put in once facet respects size: 0
            })
            .getNext(),
        }),
    },
  },
}

module.exports = MemoryProvider
