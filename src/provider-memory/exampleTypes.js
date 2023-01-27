import _ from 'lodash/fp.js'
import F from 'futil'
import date from './date.js'
import results from './results.js'

export default () => ({
  default: {
    validContext: () => true,
    hasValue: () => true,
  },
  date,
  results,
  number: {
    hasValue: (node) => F.isNotNil(node.min) || F.isNotNil(node.max),
    filter: ({ field, min = -Infinity, max = Infinity }) =>
      _.conforms({
        [field]: _.inRange(min, max),
      }),
  },
  exists: {
    hasValue: ({ value }) => _.isBoolean(value),
    filter: ({ field, value }) =>
      // No _.conforms here since it does not get invoked on props which do not exist
      _.flow(_.get(field), value ? F.isNotNil : _.isNil),
  },
  bool: {
    hasValue: ({ value }) => _.isBoolean(value),
    filter: ({ field, value }) =>
      _.conforms({
        [field]: _.isEqual(value),
      }),
  },
  facet: {
    hasValue: (node) => _.size(node.values),
    filter: ({ field, values, mode = 'include' }) =>
      _.flow(
        _.get(field),
        _.castArray,
        mode === 'include'
          ? _.intersectionWith(_.isEqual, values)
          : _.differenceWith(_.isEqual, _, values),
        _.negate(_.isEmpty)
      ),
    result({ field, size = 10, optionsFilter }, search) {
      let options = search(
        _.flow(
          _.flatMap(field),
          _.reject(_.isUndefined),
          _.map(JSON.stringify),
          optionsFilter ? _.filter(F.matchAnyWord(optionsFilter)) : _.identity,
          _.countBy(_.identity),
          _.toPairs,
          _.map(([name, count]) => ({ name: JSON.parse(name), count })),
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
    hasValue: (node) => node.value || _.size(node.values),
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
        (nodeValue) => (recordValue) =>
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
})
