import _ from 'lodash/fp.js'
import Contexture from './index.js'
import provider from './provider-memory/index.js'
import memoryExampleTypes from './provider-memory/exampleTypes.js'
import exampleTypes from './exampleTypes.js'
import movies from './__data__/imdb.js'

let getResultsNode = () => ({
  key: 'results',
  type: 'results',
  config: {
    page: 1,
  },
})

let getSavedSearch = async (id) =>
  ({
    AdamFavorites: {
      key: 'criteria',
      type: 'group',
      schema: 'favorites',
      join: 'and',
      children: [
        {
          key: 'filter',
          type: 'facet',
          field: 'user',
          values: ['Adam'],
        },
      ],
    },
    HopeFavorites: {
      key: 'criteria',
      type: 'group',
      schema: 'favorites',
      join: 'and',
      children: [
        {
          key: 'filter',
          type: 'facet',
          field: 'user',
          values: ['Hope'],
        },
      ],
    },
  }[id])

describe('Memory Provider', () => {
  let now = new Date()
  let process = Contexture({
    schemas: {
      test: {
        memory: {
          records: [{ a: 1, b: 1 }, { a: 1, b: 3 }, { a: 2, b: 2 }, { a: 3 }],
        },
      },
      test2: {
        memory: {
          records: [
            { b: 1, c: 1 },
            { b: 2, c: 2 },
            { b: 3, c: 1 },
          ],
        },
      },
      bool: {
        memory: {
          records: [
            { a: true, b: true },
            { a: true, b: false },
            { a: false, b: true },
            { a: false, b: false },
            { a: true },
            { a: false },
            { a: 1 },
            { a: 0 },
            { a: '1' },
          ],
        },
      },
      arrayFacets: {
        memory: {
          records: [
            { b: 1, c: [1, 2] },
            { b: 2, c: [1, 2] },
            { b: 3, c: [1, 2] },
          ],
        },
      },
      arrayOfObjectsFacets: {
        memory: {
          records: [
            { b: 1, c: [{ a: 1 }, { b: 1 }] },
            { b: 2, c: [{ a: 1 }, { b: 1 }] },
            { b: 3, c: [{ a: 1 }, { b: 1 }] },
          ],
        },
      },
      movies: {
        memory: {
          records: _.map((x) => {
            x.released = new Date(x.released)
            return x
          }, movies),
        },
      },
      favorites: {
        memory: {
          records: [
            { movie: 'Game of Thrones', user: 'Adam' },
            { movie: 'The Matrix', user: 'Adam' },
            { movie: 'Star Trek: The Next Generation', user: 'Adam' },
            { movie: 'Game of Thrones', user: 'Hope' },
            { movie: 'The Lucky One', user: 'Hope' },
          ],
        },
      },
      currentYearMovies: {
        memory: {
          records: _.flow(
            _.take(5),
            _.map((x) => ({ ...x, released: now }))
          )(movies),
        },
      },
    },
    providers: {
      memory: {
        ...provider,
        types: {
          ...memoryExampleTypes(),
          ...exampleTypes({
            getSavedSearch,
          }),
        },
      },
    },
  })
  describe('basic test cases', () => {
    it('should handle basic AND test case', async () => {
      let dsl = {
        key: 'root',
        type: 'group',
        schema: 'test',
        join: 'and',
        children: [
          {
            key: 'filter',
            type: 'facet',
            field: 'a',
            values: [1, 2],
          },
          {
            key: 'filter2',
            type: 'facet',
            field: 'a',
            values: [1],
          },
          getResultsNode(),
        ],
      }
      let result = await process(dsl)
      expect(result.children[0].context).toEqual({
        cardinality: 1,
        options: [{ name: 1, count: 2 }],
      })
      expect(result.children[1].context).toEqual({
        cardinality: 2,
        options: [
          { name: 1, count: 2 },
          { name: 2, count: 1 },
        ],
      })
      expect(result.children[2].context).toEqual({
        results: [
          { a: 1, b: 1 },
          { a: 1, b: 3 },
        ],
        totalRecords: 2,
      })
    })
    it('should handle basic OR test case', async () => {
      let dsl = {
        key: 'root',
        type: 'group',
        schema: 'test',
        join: 'or',
        children: [
          {
            key: 'filter',
            type: 'facet',
            field: 'a',
            values: [1, 2],
          },
          {
            key: 'filter2',
            type: 'facet',
            field: 'a',
            values: [1],
          },
          getResultsNode(),
        ],
      }
      let result = await process(dsl)
      expect(result.children[0].context).toEqual({
        cardinality: 3,
        options: [
          { name: 1, count: 2 },
          { name: 2, count: 1 },
          { name: 3, count: 1 },
        ],
      })
      expect(result.children[1].context).toEqual({
        cardinality: 3,
        options: [
          { name: 1, count: 2 },
          { name: 2, count: 1 },
          { name: 3, count: 1 },
        ],
      })
      expect(result.children[2].context).toEqual({
        results: [{ a: 1, b: 1 }, { a: 1, b: 3 }, { a: 2, b: 2 }, { a: 3 }],
        totalRecords: 4,
      })
    })
    it('should handle EXCLUDE mode', async () => {
      let dsl = {
        key: 'root',
        type: 'group',
        schema: 'test',
        join: 'and',
        children: [
          {
            key: 'filter',
            type: 'facet',
            mode: 'exclude',
            field: 'a',
            values: [1, 2],
          },
          getResultsNode(),
        ],
      }
      let result = await process(dsl)
      expect(result.children[1].context).toEqual({
        results: [{ a: 3 }],
        totalRecords: 1,
      })
    })
    it('should handle savedSearch', async () => {
      let dsl = {
        key: 'root',
        type: 'group',
        schema: 'test',
        join: 'and',
        children: [
          {
            key: 'savedSearch',
            type: 'savedSearch',
            search: {
              key: 'root',
              type: 'group',
              schema: 'test',
              join: 'and',
              children: [
                {
                  key: 'filter2',
                  type: 'facet',
                  field: 'a',
                  values: [1],
                },
                getResultsNode(),
              ],
            },
          },
          getResultsNode(),
        ],
      }
      let result = await process(dsl)
      expect(result.children[1].context).toEqual({
        results: [
          { a: 1, b: 1 },
          { a: 1, b: 3 },
        ],
        totalRecords: 2,
      })
    })
    it('should handle subquery', async () => {
      let dsl = {
        key: 'root',
        type: 'group',
        schema: 'test2',
        join: 'and',
        children: [
          {
            key: 'subquery',
            type: 'subquery',
            localField: 'b',
            foreignField: 'b',
            search: {
              key: 'root',
              type: 'group',
              schema: 'test',
              join: 'and',
              children: [
                {
                  key: 'filter',
                  type: 'facet',
                  field: 'a',
                  values: [1],
                },
                getResultsNode(),
              ],
            },
          },
          getResultsNode(),
        ],
      }
      let result = await process(dsl)
      expect(result.children[1].context).toEqual({
        results: [
          { b: 1, c: 1 },
          { b: 3, c: 1 },
        ],
        totalRecords: 2,
      })
    })
    it('should unwind array facets', async () => {
      let dsl = {
        key: 'root',
        type: 'group',
        schema: 'arrayFacets',
        join: 'and',
        children: [
          {
            key: 'filter',
            type: 'facet',
            field: 'c',
          },
        ],
      }
      let result = await process(dsl)
      expect(result.children[0].context.options).toEqual([
        { name: 1, count: 3 },
        { name: 2, count: 3 },
      ])
    })
    it('should unwind array of objects facets', async () => {
      let dsl = {
        key: 'root',
        type: 'group',
        schema: 'arrayOfObjectsFacets',
        join: 'and',
        children: [
          {
            key: 'filter',
            type: 'facet',
            field: 'c',
          },
        ],
      }
      let result = await process(dsl)
      expect(result.children[0].context.options).toEqual([
        { name: { a: 1 }, count: 3 },
        { name: { b: 1 }, count: 3 },
      ])
    })
  })

  describe('exists test cases', () => {
    let dsl = {
      key: 'root',
      type: 'group',
      schema: 'test',
      join: 'and',
      children: [
        {
          key: 'filter',
          type: 'exists',
          field: 'a',
        },
        getResultsNode(),
      ],
    }
    it('exists (null) should work', async () => {
      dsl.children[0].values = null
      let result = await process(dsl)
      expect(result.children[1].context).toEqual({
        results: [{ a: 1, b: 1 }, { a: 1, b: 3 }, { a: 2, b: 2 }, { a: 3 }],
        totalRecords: 4,
      })
    })
    it('exists (true) should work', async () => {
      dsl.children[0].value = true
      let result = await process(dsl)
      expect(result.children[1].context).toEqual({
        results: [{ a: 1, b: 1 }, { a: 1, b: 3 }, { a: 2, b: 2 }, { a: 3 }],
        totalRecords: 4,
      })
    })
    it('exists (false) should work', async () => {
      dsl.children[0].field = 'b'
      dsl.children[0].value = false
      let result = await process(dsl)
      expect(result.children[1].context).toEqual({
        results: [{ a: 3 }],
        totalRecords: 1,
      })
    })
  })

  describe('bool test cases', () => {
    let dsl = {
      key: 'root',
      type: 'group',
      schema: 'bool',
      join: 'and',
      children: [
        {
          key: 'filter',
          type: 'bool',
          field: 'a',
        },
        getResultsNode(),
      ],
    }
    it('bool (null) should work', async () => {
      dsl.children[0].values = null
      let result = await process(dsl)
      expect(result.children[1].context).toEqual({
        results: [
          { a: true, b: true },
          { a: true, b: false },
          { a: false, b: true },
          { a: false, b: false },
          { a: true },
          { a: false },
          { a: 1 },
          { a: 0 },
          { a: '1' },
        ],
        totalRecords: 9,
      })
    })
    it('bool (true) should work', async () => {
      dsl.children[0].value = true
      let result = await process(dsl)
      expect(result.children[1].context).toEqual({
        results: [{ a: true, b: true }, { a: true, b: false }, { a: true }],
        totalRecords: 3,
      })
    })
    it('bool (false) should work', async () => {
      dsl.children[0].field = 'b'
      dsl.children[0].value = false
      let result = await process(dsl)
      expect(result.children[1].context).toEqual({
        results: [
          { a: true, b: false },
          { a: false, b: false },
        ],
        totalRecords: 2,
      })
    })
  })

  describe('imdb test cases', () => {
    it('should handle facets', async () => {
      let dsl = {
        key: 'root',
        type: 'group',
        schema: 'movies',
        join: 'and',
        children: [
          {
            key: 'ratings',
            type: 'facet',
            field: 'rated',
            values: ['R', 'PG-13'],
          },
          getResultsNode(),
        ],
      }
      let result = await process(dsl)
      let ratings = _.find({ key: 'ratings' }, result.children).context
      expect(ratings.cardinality).toBe(25)
      expect(ratings.options).toEqual([
        { name: 'R', count: 1104 },
        { name: 'PG-13', count: 525 },
        { name: 'TV-14', count: 361 },
        { name: 'PG', count: 333 },
        { name: 'Not Rated', count: 217 },
        { name: 'TV-PG', count: 169 },
        { name: 'TV-MA', count: 152 },
        { name: 'Approved', count: 149 },
        { name: 'Unrated', count: 125 },
        { name: 'G', count: 87 },
      ])
      let results = _.find({ key: 'results' }, result.children).context.results
      let inspectedResults = results.map(_.pick(['title', 'year', 'rated']))
      expect(inspectedResults).toEqual([
        { title: 'The Dark Knight Rises', year: 2012, rated: 'PG-13' },
        { title: 'The Usual Suspects', year: 1995, rated: 'R' },
        { title: 'American Beauty', year: 1999, rated: 'R' },
        { title: 'The Prestige', year: 2006, rated: 'PG-13' },
        { title: 'Braveheart', year: 1995, rated: 'R' },
        {
          title: 'Eternal Sunshine of the Spotless Mind',
          year: 2004,
          rated: 'R',
        },
        { title: 'The Sixth Sense', year: 1999, rated: 'PG-13' },
        { title: 'Life Is Beautiful', year: 1997, rated: 'PG-13' },
        { title: "Pan's Labyrinth", year: 2006, rated: 'R' },
        { title: 'Heat', year: 1995, rated: 'R' },
      ])
    })
    it('should handle text', async () => {
      let dsl = {
        key: 'root',
        type: 'group',
        schema: 'movies',
        join: 'and',
        children: [
          {
            key: 'filter',
            type: 'text',
            field: 'title',
            value: 'game',
            operator: 'startsWith',
          },
          getResultsNode(),
        ],
      }
      let result = await process(dsl)
      let results = _.find({ key: 'results' }, result.children).context.results
      let inspectedResults = _.map('title', results)
      expect(inspectedResults).toEqual([
        'Game of Thrones',
        'Gamer',
        'Game Night',
      ])
    })
    it('should handle date (exact)', async () => {
      let dsl = {
        key: 'root',
        type: 'group',
        schema: 'movies',
        join: 'and',
        children: [
          {
            key: 'datefilter',
            type: 'date',
            field: 'released',
            from: '2013-01-01',
          },
          getResultsNode(),
        ],
      }
      let result = await process(dsl)
      let results = _.find({ key: 'results' }, result.children).context.results
      let inspectedResults = _.map('year', results)

      expect(inspectedResults).toEqual([
        2011, 1977, 2012, 1995, 1999, 1981, 2008, 2006, 1995, 2004,
      ])
    })
    it('should handle date (range)', async () => {
      let dsl = {
        key: 'root',
        type: 'group',
        schema: 'currentYearMovies',
        join: 'and',
        children: [
          {
            key: 'datefilter',
            type: 'date',
            field: 'released',
            range: 'thisCalendarYear',
          },
          getResultsNode(),
        ],
      }
      let result = await process(dsl)
      let results = _.find({ key: 'results' }, result.children).context.results
      let inspectedResults = _.flow(
        _.map((x) => x.released.getFullYear()),
        _.uniq
      )(results)
      expect(inspectedResults).toEqual([now.getFullYear()])
    })
    it('should handle results sorting', async () => {
      let dsl = {
        key: 'root',
        type: 'group',
        schema: 'movies',
        join: 'and',
        children: [
          {
            key: 'results',
            type: 'results',
            page: 1,
            pageSize: 1,
            sortField: 'year',
          },
        ],
      }
      let result = await process(dsl)
      let results = _.find({ key: 'results' }, result.children).context.results
      let inspectedResults = _.map('year', results)
      expect(inspectedResults).toEqual([2013])

      dsl.children[0].sortDir = 'asc'
      let ascResult = await process(dsl)
      let ascResults = _.find({ key: 'results' }, ascResult.children).context
        .results
      let ascInspectedResults = _.map('year', ascResults)
      expect(ascInspectedResults).toEqual([1915])
    })
    it('should handle subquery', async () => {
      let dsl = {
        key: 'root',
        type: 'group',
        schema: 'movies',
        join: 'and',
        children: [
          {
            key: 'subquery',
            type: 'subquery',
            localField: 'title',
            foreignField: 'movie',
            search: {
              key: 'root',
              type: 'group',
              schema: 'favorites',
              join: 'and',
              children: [
                {
                  key: 'filter',
                  type: 'facet',
                  field: 'user',
                  values: ['Adam'],
                },
              ],
            },
          },
          getResultsNode(),
        ],
      }
      let result = await process(dsl)
      let results = result.children[1].context.results
      expect(_.map('title', results)).toEqual([
        'Game of Thrones',
        'Star Trek: The Next Generation',
        'The Matrix',
      ])
    })
    it('should handle subquery by saved search id', async () => {
      let dsl = {
        key: 'root',
        type: 'group',
        schema: 'movies',
        join: 'and',
        children: [
          {
            key: 'subquery',
            type: 'subquery',
            localField: 'title',
            foreignField: 'movie',
            searchId: 'AdamFavorites',
          },
          getResultsNode(),
        ],
      }
      let result = await process(dsl)
      let results = result.children[1].context.results
      expect(_.map('title', results)).toEqual([
        'Game of Thrones',
        'Star Trek: The Next Generation',
        'The Matrix',
      ])
    })
    it('should handle pagination', async () => {
      let dsl = {
        key: 'results',
        type: 'results',
        pageSize: 2,
        schema: 'favorites',
      }
      let result = await process(dsl)
      let firstPage = result.context.results
      expect(_.map('movie', firstPage)).toEqual([
        'Game of Thrones',
        'The Matrix',
      ])
      result = await process({ ...dsl, page: 2 })
      let secondPage = result.context.results
      expect(_.map('movie', secondPage)).toEqual([
        'Star Trek: The Next Generation',
        'Game of Thrones',
      ])
    })
    it('should handle raw', async () => {
      let dsl = {
        key: 'raw',
        schema: 'movies',
        type: 'raw',
        filter: (x) => x.year > 2010,
        result: _.flow(_.map('year'), _.uniq),
      }
      let result = await process(dsl)
      expect(result.context.result).toEqual([2011, 2012, 2013])
    })
    it('should handle onResult', async () => {
      let dsl = {
        key: 'root',
        type: 'group',
        schema: 'movies',
        join: 'and',
        children: [
          {
            key: 'ratings',
            type: 'facet',
            field: 'rated',
            values: ['R', 'PG-13'],
          },
          getResultsNode(),
        ],
      }
      let results = []
      let onResult = (x) => {
        results.push(x)
      }
      await process(dsl, { onResult })
      expect(_.map('path', results)).toEqual([
        ['root'],
        ['root', 'ratings'],
        ['root', 'results'],
      ])
    })
  })
})
