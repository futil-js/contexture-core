let _ = require('lodash/fp')
let MockDate = require('mockdate')
let moment = require('moment-timezone')
let Contexture = require('../src/index')
let provider = require('../src/provider-memory')
let memoryExampleTypes = require('../src/provider-memory/exampleTypes')

let dates = () => [
  {
    key: 'last15Months',
    date: moment()
      .subtract(15, 'months')
      .format(),
  },
  {
    key: 'lastMonth',
    date: moment()
      .subtract(1, 'months')
      .format(),
  },
  {
    key: 'last3Days',
    date: moment()
      .subtract(3, 'days')
      .format(),
  },
  {
    key: 'last6Days',
    date: moment()
      .subtract(6, 'days')
      .format(),
  },
  {
    key: 'last20Days',
    date: moment()
      .subtract(20, 'days')
      .format(),
  },
  {
    key: 'last6Months',
    date: moment()
      .subtract(6, 'months')
      .format(),
  },
  {
    key: 'last10Weeks',
    date: moment()
      .subtract(10, 'weeks')
      .toDate()
      .getTime(),
  },
  {
    key: 'last20Months',
    date: moment()
      .subtract(20, 'months')
      .format('LLLL'),
  },
  {
    key: 'last5Years',
    date: moment()
      .subtract(5, 'years')
      .format('MM/DD/YYYY'),
  },
  {
    key: 'tomorrow',
    date: moment()
      .add(1, 'days')
      .format(),
  },
  {
    key: 'nextMonth',
    date: moment()
      .add(1, 'months')
      .format(),
  },
  {
    key: 'next6Months',
    date: moment()
      .add(6, 'months')
      .format(),
  },
  {
    key: 'next5Years',
    date: moment()
      .add(5, 'years')
      .format(),
  },
]

let dsl = {
  key: 'root',
  type: 'group',
  schema: 'date',
  join: 'and',
  children: [
    {
      type: 'date',
      field: 'date',
    },
    {
      key: 'results',
      type: 'results',
      config: {
        page: 1,
      },
    },
  ],
}

let process = () =>
  Contexture({
    schemas: {
      date: {
        memory: {
          records: dates(),
        },
      },
    },
    providers: {
      memory: {
        ...provider,
        types: {
          ...memoryExampleTypes(),
        },
      },
    },
  })

let testRange = async ({ range = 'exact', from, to, expected }) => {
  let tree = _.cloneDeep(dsl)
  tree.children[0] = { ...tree.children[0], range, from, to }
  let response = await process()(tree)
  let results = _.map(key => _.find({ key }, dates()), expected)
  expect(response.children[1].context).toEqual({
    results,
    totalRecords: results.length,
  })
}

describe('Date example type test cases', () => {
  beforeAll(() => {
    MockDate.set(moment('2021-12-01T21:39:10.172Z', moment.ISO_8601))
  })
  afterAll(() => {
    MockDate.reset()
  })
  it('allFutureDates', async () =>
    testRange({
      range: 'allFutureDates',
      expected: ['tomorrow', 'nextMonth', 'next6Months', 'next5Years'],
    }))
  it('allPastDates', async () =>
    testRange({
      range: 'allPastDates',
      expected: [
        'last15Months',
        'lastMonth',
        'last3Days',
        'last6Days',
        'last20Days',
        'last6Months',
        'last10Weeks',
        'last20Months',
        'last5Years',
      ],
    }))
  it('last3Days', async () => testRange({ range: 'last3Days', expected: [] }))
  it('last7Days', async () =>
    testRange({ range: 'last7Days', expected: ['last3Days', 'last6Days'] }))
  it('last90Days', async () =>
    testRange({
      range: 'last90Days',
      expected: [
        'lastMonth',
        'last3Days',
        'last6Days',
        'last20Days',
        'last10Weeks',
      ],
    }))
  it('lastCalendarMonth', async () =>
    testRange({
      range: 'lastCalendarMonth',
      expected: ['lastMonth', 'last3Days', 'last6Days', 'last20Days'],
    }))
  it('next6Months', async () =>
    testRange({ range: 'next6Months', expected: ['tomorrow', 'nextMonth'] }))
  it('next36Months', async () =>
    testRange({
      range: 'next36Months',
      expected: ['tomorrow', 'nextMonth', 'next6Months'],
    }))
  it('exact FROM with open TO', async () =>
    testRange({
      from: moment()
        .subtract(65, 'days')
        .format(),
      expected: [
        'lastMonth',
        'last3Days',
        'last6Days',
        'last20Days',
        'tomorrow',
        'nextMonth',
        'next6Months',
        'next5Years',
      ],
    }))
  it('exact TO with open FROM', async () =>
    testRange({
      to: new Date(),
      expected: [
        'last15Months',
        'lastMonth',
        'last3Days',
        'last6Days',
        'last20Days',
        'last6Months',
        'last10Weeks',
        'last20Months',
        'last5Years',
      ],
    }))
  it('exact FROM & TO', async () =>
    testRange({
      from: moment()
        .subtract(1, 'weeks')
        .format(),
      to: new Date(),
      expected: ['last3Days', 'last6Days'],
    }))
})
