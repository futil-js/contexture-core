let { getProvider, getRelevantFilters } = require('../src/utils')
let DebugProvider = require('../src/provider-debug')

describe('Utils', () => {
  // Not handled - missing schema, schema with no matching provider
  describe('getProvider', () => {
    let Providers = {
      provider1: {
        a: 1,
      },
      provider2: {
        a: 2,
      },
    }
    let Schemas = {
      schema1: {
        randomProperty: 6,
        provider1: {
          random: 'stuff',
        },
        provider2: {
          random: 'other stuff',
        },
      },
      schema2: {
        randomProperty: 6,
        provider2: {
          random: 'stuff',
        },
      },
    }
    let f = getProvider(Providers, Schemas)
    it('should support explicit providers', () => {
      let provider = f({
        random: 'stuff',
        schema: 'schema2',
        provider: 'provider1',
      })
      expect(provider).toBe(Providers.provider1)
    })
    it('should get first provider on schema', () => {
      let provider = f({
        schema: 'schema1',
      })
      expect(provider).toBe(Providers.provider1)
    })
  })
  describe('getRelevantFilters', () => {
    it('should handle basic sibling', () => {
      let result = getRelevantFilters(
        DebugProvider.groupCombinator,
        ['a', 'b', 'c'],
        {
          key: 'a',
          join: 'and',
          children: [
            {
              key: 'b',
              join: 'and',
              children: [
                {
                  key: 'c',
                },
                {
                  key: 'd',
                  _meta: {
                    filter: 'test',
                  },
                },
              ],
            },
          ],
        }
      )
      expect(result).toEqual('test')
    })
    it('should handle basic sibling, but with items instead of children', () => {
      let result = getRelevantFilters(
        DebugProvider.groupCombinator,
        ['a', 'b', 'c'],
        {
          key: 'a',
          join: 'and',
          items: [
            {
              key: 'b',
              join: 'and',
              items: [
                {
                  key: 'c',
                },
                {
                  key: 'd',
                  _meta: {
                    filter: 'test',
                  },
                },
              ],
            },
          ],
        }
      )
      expect(result).toEqual('test')
    })
    it('should handle two siblings', () => {
      let result = getRelevantFilters(
        DebugProvider.groupCombinator,
        ['a', 'b', 'c'],
        {
          key: 'a',
          join: 'and',
          children: [
            {
              key: 'b',
              join: 'and',
              children: [
                {
                  key: 'c',
                },
                {
                  key: 'd',
                  _meta: {
                    filter: 'test',
                  },
                },
                {
                  key: 'e',
                  _meta: {
                    filter: 'test2',
                  },
                },
              ],
            },
          ],
        }
      )
      expect(result).toEqual({
        and: ['test', 'test2'],
      })
    })
    it('should handle sibling a level above and collapse', () => {
      let result = getRelevantFilters(
        DebugProvider.groupCombinator,
        ['a', 'b', 'c'],
        {
          key: 'a',
          join: 'and',
          children: [
            {
              key: 'b',
              join: 'and',
              children: [
                {
                  key: 'c',
                },
                {
                  key: 'd',
                  _meta: {
                    filter: 'test',
                  },
                },
              ],
            },
            {
              key: 'blah',
              _meta: {
                filter: 'blah',
              },
            },
          ],
        }
      )
      expect(result).toEqual({
        and: ['test', 'blah'],
      })
    })
    it('should handle ORs', () => {
      let result = getRelevantFilters(
        DebugProvider.groupCombinator,
        ['a', 'b', 'c'],
        {
          key: 'a',
          join: 'and',
          children: [
            {
              key: 'b',
              join: 'or',
              children: [
                {
                  key: 'c',
                },
                {
                  key: 'd',
                  _meta: {
                    filter: 'test',
                  },
                },
              ],
            },
            {
              key: 'blah',
              _meta: {
                filter: 'blah',
              },
            },
          ],
        }
      )
      expect(result).toEqual('blah')
    })
    it('should not collapse NOT', () => {
      let result = getRelevantFilters(
        DebugProvider.groupCombinator,
        ['a', 'b', 'c'],
        {
          key: 'a',
          join: 'and',
          children: [
            {
              key: 'b',
              join: 'and',
              children: [
                {
                  key: 'c',
                },
                {
                  key: 'd',
                  _meta: {
                    filter: 'test',
                  },
                },
              ],
            },
            {
              key: 'blah',
              join: 'not',
              children: [
                {
                  key: 'asdf',
                  _meta: {
                    filter: 'blah',
                  },
                },
              ],
            },
          ],
        }
      )
      expect(result).toEqual({
        and: [
          'test',
          {
            not: ['blah'],
          },
        ],
      })
    })

    it('should handle nested OR', () => {
      let result = getRelevantFilters(
        DebugProvider.groupCombinator,
        ['root', 'analysis', 'results'],
        {
          key: 'root',
          join: 'and',
          children: [
            {
              key: 'criteria',
              join: 'and',
              children: [
                {
                  key: 'cgnya6ja8ys10iwl8fr',
                  _meta: {
                    filter: 'cable',
                  },
                },
                {
                  key: 'criteria',
                  join: 'or',
                  children: [
                    {
                      key: '8ilrqpm1je3m8ed5z5mi',
                      _meta: {
                        filter: 'agency:DOD',
                      },
                    },
                    {
                      key: 'e0sj1aby2bh3f168ncdi',
                      _meta: {
                        filter: 'agency:FL',
                      },
                    },
                  ],
                  _meta: {
                    filter: 'test2-3',
                  },
                },
              ],
            },
            {
              type: 'group',
              key: 'analysis',
              join: 'and',
              children: [
                {
                  key: 'results',
                },
              ],
            },
          ],
        }
      )
      expect(result).toEqual({
        and: [
          'cable',
          {
            or: ['agency:DOD', 'agency:FL'],
          },
        ],
      })
    })
    it('should handle deep nested OR', () => {
      let result = getRelevantFilters(
        DebugProvider.groupCombinator,
        ['root', 'analysisOR', 'analysis', 'results'],
        {
          key: 'root',
          join: 'and',
          children: [
            {
              key: 'criteria',
              join: 'and',
              children: [
                {
                  key: 'cgnya6ja8ys10iwl8fr',
                  _meta: {
                    filter: 'cable',
                  },
                },
                {
                  key: 'criteria',
                  join: 'or',
                  children: [
                    {
                      key: '8ilrqpm1je3m8ed5z5mi',
                      _meta: {
                        filter: 'agency:DOD',
                      },
                    },
                    {
                      key: 'e0sj1aby2bh3f168ncdi',
                      _meta: {
                        filter: 'agency:FL',
                      },
                    },
                  ],
                  _meta: {
                    filter: 'test2-3',
                  },
                },
              ],
            },
            {
              key: 'analysisOR',
              join: 'or',
              children: [
                {
                  type: 'group',
                  key: 'analysis',
                  join: 'and',
                  children: [
                    {
                      key: 'results',
                    },
                  ],
                },
                {
                  key: 'asdf',
                  _meta: {
                    filter: 'res:FL',
                  },
                },
              ],
            },
          ],
        }
      )
      expect(result).toEqual({
        and: [
          'cable',
          {
            or: ['agency:DOD', 'agency:FL'],
          },
        ],
      })
    })
    it('should handle a top level OR', () => {
      let result = getRelevantFilters(
        DebugProvider.groupCombinator,
        ['root', 'analysisOR', 'analysis', 'results'],
        {
          key: 'root',
          join: 'or',
          children: [
            {
              key: 'criteria',
              join: 'and',
              children: [
                {
                  key: 'cgnya6ja8ys10iwl8fr',
                  _meta: {
                    filter: 'cable',
                  },
                },
                {
                  key: 'criteria',
                  join: 'or',
                  children: [
                    {
                      key: '8ilrqpm1je3m8ed5z5mi',
                      _meta: {
                        filter: 'agency:DOD',
                      },
                    },
                    {
                      key: 'e0sj1aby2bh3f168ncdi',
                      _meta: {
                        filter: 'agency:FL',
                      },
                    },
                  ],
                  _meta: {
                    filter: 'test2-3',
                  },
                },
              ],
            },
            {
              key: 'analysisOR',
              join: 'and',
              children: [
                {
                  type: 'group',
                  key: 'analysis',
                  join: 'and',
                  children: [
                    {
                      key: 'results',
                    },
                  ],
                },
                {
                  key: 'asdf',
                  _meta: {
                    filter: 'res:FL',
                  },
                },
              ],
            },
          ],
        }
      )
      expect(result).toEqual('res:FL')
    })
    it('should handle nested AND', () => {
      let result = getRelevantFilters(
        DebugProvider.groupCombinator,
        ['root', 'criteria', 'criteria2', 'dod'],
        {
          key: 'root',
          join: 'and',
          children: [
            {
              key: 'criteria',
              join: 'and',
              children: [
                {
                  key: 'cgnya6ja8ys10iwl8fr',
                  _meta: {
                    filter: 'cable',
                  },
                },
                {
                  key: 'criteria2',
                  join: 'or',
                  children: [
                    {
                      key: 'dod',
                      _meta: {
                        filter: 'agency:DOD',
                      },
                    },
                    {
                      key: 'fl',
                      _meta: {
                        filter: 'agency:FL',
                      },
                    },
                  ],
                  _meta: {
                    filter: 'test2-3',
                  },
                },
              ],
            },
            {
              type: 'group',
              key: 'analysis',
              join: 'and',
              children: [
                {
                  key: 'results',
                  _meta: {
                    filter: 'result',
                  },
                },
              ],
            },
          ],
        }
      )
      expect(result).toEqual({
        and: ['cable', 'result'],
      })
    })
  })
})
