let _ = require('lodash/fp')
let moment = require('moment-timezone')
let datemath = require('@elastic/datemath')

let dateMin = -8640000000000000
let dateMax = 8640000000000000

let getStartOfQuarter = (quarterOffset, timezone) => {
  let quarter =
    moment()
      .tz(timezone)
      .quarter() + quarterOffset
  return moment()
    .tz(timezone)
    .quarter(quarter)
    .startOf('quarter')
}

let getEndOfQuarter = date =>
  moment(date)
    .add(1, 'Q')
    .subtract(1, 'ms')

let quarterToOffset = {
  thisCalendarQuarter: 0,
  lastCalendarQuarter: -1,
  nextCalendarQuarter: 1,
}

// https://www.elastic.co/guide/en/elasticsearch/reference/7.x/common-options.html#date-math
let rangeToDatemath = {
  last3Days: { from: 'now-3d', to: 'now' },
  last7Days: { from: 'now-7d', to: 'now' },
  last30Days: { from: 'now-30d', to: 'now' },
  last90Days: { from: 'now-90d', to: 'now' },
  last180Days: { from: 'now-180d', to: 'now' },
  last12Months: { from: 'now/d-12M', to: 'now' },
  last15Months: { from: 'now/d-15M', to: 'now' },
  last18Months: { from: 'now/d-18M', to: 'now' },
  last24Months: { from: 'now/d-24M', to: 'now' },
  last36Months: { from: 'now/d-36M', to: 'now' },
  last48Months: { from: 'now/d-48M', to: 'now' },
  last60Months: { from: 'now/d-60M', to: 'now' },
  lastCalendarMonth: { from: 'now-1M/M', to: 'now/M-1ms' },
  lastCalendarYear: { from: 'now-1y/y', to: 'now/y-1ms' },
  thisCalendarMonth: { from: 'now/M', to: 'now+1M/M-1ms' },
  thisCalendarYear: { from: 'now/y', to: 'now+1y/y-1ms' },
  nextCalendarMonth: { from: 'now+1M/M', to: 'now+2M/M-1ms' },
  nextCalendarYear: { from: 'now+1y/y', to: 'now+2y/y-1ms' },
  next30Days: { from: 'now/d', to: 'now/d+30d-1ms' },
  next60Days: { from: 'now/d', to: 'now/d+60d-1ms' },
  next90Days: { from: 'now/d', to: 'now/d+90d-1ms' },
  next6Months: { from: 'now/d', to: 'now/d+6M-1ms' },
  next12Months: { from: 'now/d', to: 'now/d+12M-1ms' },
  next24Months: { from: 'now/d', to: 'now/d+24M-1ms' },
  next36Months: { from: 'now/d', to: 'now/d+36M-1ms' },
  allPastDates: { from: '', to: 'now/d-1ms' },
  allFutureDates: { from: 'now/d', to: '' },
}

let parseAndShift = (exp, timezone) => {
  let computed = datemath.parse(exp)
  // Replace the server timezone with the user's timezone if the expression
  // is relative to the start of a day, month, year, etc.
  return /\//.test(exp) ? moment(computed).tz(timezone, true) : computed
}

let rollingRangeToDates = (range, timezone) => {
  if (_.has(range, quarterToOffset)) {
    let from = getStartOfQuarter(quarterToOffset[range], timezone)
    let to = getEndOfQuarter(from)
    return { from, to }
  } else {
    let expressions = rangeToDatemath[range]
    let from = parseAndShift(expressions.from, timezone)
    let to = parseAndShift(expressions.to, timezone)
    return { from, to }
  }
}

let dateTypeToFormatFn = {
  date: x => x && moment.utc(x).toDate(),
  unix: x => x && moment.utc(x).unix(),
  timestamp: x => x && new Date(x).getTime(),
}

let hasValue = ({ from, to, range }) =>
  range &&
  range !== 'allDates' &&
  ((range === 'exact' && (from || to)) || range !== 'exact')

module.exports = {
  hasValue,
  // NOTE: timezone is only used for rolling dates
  filter({
    field,
    range,
    dateType = 'timestamp',
    timezone = 'UTC',
    ...context
  }) {
    let { from, to } = _.includes(range, ['exact', 'allDates'])
      ? context
      : rollingRangeToDates(range, timezone)

    let format = dateTypeToFormatFn[dateType]

    if (!from) {
      from = dateMin
    }
    if (!to) {
      to = dateMax
    }

    return _.flow(_.get(field), format, _.inRange(format(from), format(to)))
  },
}
