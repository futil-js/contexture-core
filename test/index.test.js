let Contexture = require('../src/index')
let provider = require('../src/provider-debug')
let _ = require('lodash/fp')

describe('Contexture Core', () => {
  let process = Contexture({
    schemas: {
      test: {
        debug: true,
      },
    },
    providers: {
      debug: provider,
    },
  })
  let dsl = {
    key: 'root',
    type: 'group',
    schema: 'test',
    // join: 'and',
    children: [
      {
        key: 'filter',
        type: 'test',
        data: {
          value: 1,
        },
        config: {
          c: 1,
        },
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
  it('should work', async () => {
    let {
      children: [filter, results],
    } = await process(dsl)
    expect(filter.context).toEqual({
      abc: 123,
    })
    expect(filter._meta).toBeFalsy()
    expect(results.context).toEqual({
      results: [],
    })
    expect(results._meta).toBeFalsy()
  })
  it('should add _meta with debug option', async () => {
    let result = await process(dsl, { debug: true })
    let {
      children: [filter, results],
    } = result

    expect(filter._meta).toEqual({
      requests: [
        {
          where: undefined,
          retrieve: { test: { c: 1 } },
        },
      ],
      path: ['root', 'filter'],
      hasValue: true,
      relevantFilters: undefined,
      filter: {
        'filter (test)': {
          value: 1,
        },
      },
    })
    expect(results._meta).toEqual({
      requests: [
        {
          where: {
            'filter (test)': {
              value: 1,
            },
          },
          retrieve: {
            results: {
              page: 1,
            },
          },
        },
      ],
      path: ['root', 'results'],
      hasValue: true,
      relevantFilters: {
        'filter (test)': {
          value: 1,
        },
      },
      filter: undefined,
    })
  })
  it('should remove _meta from all valid nodes if debug option is falsy', async () => {
    let result = await process(dsl, { debug: false })
    let {
      children: [filter, results],
    } = result

    expect(_.has('_meta', filter)).toEqual(false)
    expect(_.has('_meta', results)).toEqual(false)
  })
  it('should also remove _meta from nodes without a valid context / filterOnly nodes if debug option is falsy', async () => {
    let newDSL = {
      ...dsl,
      children: dsl.children.concat({
        key: 'filterOnlyFilter',
        type: 'test',
        data: {
          value: 1,
        },
        config: {
          c: 1,
        },
        filterOnly: true,
      }),
    }

    let result = await process(newDSL, { debug: false })
    let {
      children: [, , filterOnlyNode],
    } = result

    expect(_.has('_meta', filterOnlyNode)).toEqual(false)
  })
})
