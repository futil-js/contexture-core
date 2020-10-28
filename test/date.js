let F = require('futil')
let _ = require('lodash/fp')
let { expect } = require('chai')
let moment = require('moment-timezone')
let Contexture = require('../src/index')
let provider = require('../src/provider-memory')
let memoryExampleTypes = require('../src/provider-memory/exampleTypes')

let dates = [
  { date: moment().subtract(15, 'months').format() },
  { date: moment().subtract(1, 'months').format() },
  { date: moment().subtract(3, 'days').format() },
  { date: moment().subtract(6, 'days').format() },
  { date: moment().subtract(20, 'days').format() },
  { date: moment().subtract(6, 'months').format() },
  { date: moment().subtract(10, 'months').toDate().getTime() },
  { date: moment().subtract(20, 'months').format('LLLL') },
  { date: moment().subtract(5, 'years').format('MM/DD/YYYY') },
  { date: moment().add(1, 'days').format() },
  { date: moment().add(1, 'months').format() },
  { date: moment().add(6, 'months').format() },
  { date: moment().add(5, 'years').format() },
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

let process = Contexture({
  schemas: {
    date: {
      memory: {
        records: dates,
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
  let response = await process(tree)
  let results = F.mapIndexed(v => dates[v], expected)
  expect(response.children[1].context).to.deep.equal({
    results,
    totalRecords: results.length,
  })
}

describe('Date example type test cases', () => {
  it('allFutureDates', async () =>
    testRange({ range: 'allFutureDates', expected: [9, 10, 11, 12] }))
  it('allPastDates', async () =>
    testRange({ range: 'allPastDates', expected: [0, 1, 2, 3, 4, 5, 6, 7, 8] }))
  it('last3Days', async () => testRange({ range: 'last3Days', expected: [] }))
  it('last7Days', async () =>
    testRange({ range: 'last7Days', expected: [2, 3] }))
  it('last90Days', async () =>
    testRange({ range: 'last90Days', expected: [1, 2, 3, 4] }))
  it('lastCalendarMonth', async () =>
    testRange({ range: 'lastCalendarMonth', expected: [1] }))
  it('thisCalendarYear', async () =>
    testRange({ range: 'thisCalendarYear', expected: [1, 2, 3, 4, 5, 9, 10] })),
    it('nextCalendarYear', async () =>
      testRange({ range: 'nextCalendarYear', expected: [11] })),
    it('next6Months', async () =>
      testRange({ range: 'next6Months', expected: [9, 10] }))
  it('next36Months', async () =>
    testRange({ range: 'next36Months', expected: [9, 10, 11] }))
  it('exact FROM', async () =>
    testRange({
      from: moment()
        .subtract(65, 'days')
        .format(),
      expected: [1, 2, 3, 4, 9, 10, 11, 12],
    }))
  it('exact TO', async () =>
    testRange({ to: new Date(), expected: [0, 1, 2, 3, 4, 5, 6, 7, 8] }))
  it('exact FROM & TO', async () =>
    testRange({
      from: moment()
        .subtract(1, 'weeks')
        .format(),
      to: new Date(),
      expected: [2, 3],
    }))
})
