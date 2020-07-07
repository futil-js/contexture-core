let _ = require('lodash/fp')
let F = require('futil')
let datemath = require('@elastic/datemath')
let {
  endOfDay,
  subQuarters,
  addQuarters,
  endOfQuarter,
  startOfQuarter,
} = require('date-fns/fp')
let { mapCountBy } = require('../utils')

let dateMin = -8640000000000000
let dateMax = 8640000000000000

let computeDateMathRange = (from, to) => {
  let now = Date.now()
  if (from === 'thisQuarter') {
    from = startOfQuarter(now)
    to = endOfQuarter(from)
  } else if (from === 'lastQuarter') {
    from = _.flow(startOfQuarter, subQuarters(1))(now)
    to = endOfQuarter(from)
  } else if (from === 'nextQuarter') {
    from = _.flow(startOfQuarter, addQuarters(1))(now)
    to = endOfQuarter(from)
  }
  from = datemath.parse(from).toDate()
  to = datemath.parse(to).toDate()
  if (to.getTime() < dateMax) {
    to = endOfDay(to)
  }
  return { from, to }
}

let stringContains = match => _.flow(_.toString, F.matchAnyWord(match))

module.exports = () => ({
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
    filter({ field, from = dateMin, to = dateMax, useDateMath }) {
      if (useDateMath) {
        if (!from) {
          from = new Date(dateMin)
        }
        if (!to) {
          to = new Date(dateMax)
        }
        let computeDates = computeDateMathRange(from, to)
        from = computeDates.from
        to = computeDates.to
      }
      return _.conforms({
        [field]: _.inRange(new Date(from), new Date(to)),
      })
    },
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
        [field]: _.isEqual(value),
      }),
  },
  facet: {
    hasValue: node => _.size(node.values),
    filter: ({ field, values }) =>
      _.conforms({
        [field]: _.flow(
          _.castArray,
          _.intersectionWith(_.isEqual, values),
          _.negate(_.isEmpty)
        ),
      }),
    result({ field, size = 10, optionsFilter }, search) {
      let options = search(
        _.flow(
          _.flatMap(field),
          _.reject(_.isUndefined),
          // NOTE: optionsFilter only supports string options
          optionsFilter ? _.filter(stringContains(optionsFilter)) : _.identity,
          mapCountBy(_.identity),
          _.toPairs,
          _.map(([name, count]) => ({ name, count })),
          _.orderBy('count', 'desc')
        )
      )
      return {
        cardinality: _.size(options),
        options: size ? _.take(size, options) : options,
      }
    },
  },
  text: {
    hasValue: node => node.value || _.size(node.values),
    filter({ join = 'all', values, value, operator = 'containsWord', field }) {
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
      totalRecords: search(_.size),
      results: search(
        _.flow(
          _.orderBy(sortField, sortDir),
          _.slice((page - 1) * pageSize, page * pageSize)
        )
      ),
    }),
  },
})
