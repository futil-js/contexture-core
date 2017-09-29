let { expect } = require('chai')
require('chai').should()
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
      expect(provider).to.equal(Providers.provider1)
    })
    it('should get first provider on schema', () => {
      let provider = f({
        schema: 'schema1',
      })
      expect(provider).to.equal(Providers.provider1)
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
      result.should.deep.equal('test')
    })
    it('should handle two siblings', () => {
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
      result.should.deep.equal({
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
            {
              key: 'blah',
              _meta: {
                filter: 'blah',
              },
            },
          ],
        }
      )
      result.should.deep.equal({
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
          items: [
            {
              key: 'b',
              join: 'or',
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
            {
              key: 'blah',
              _meta: {
                filter: 'blah',
              },
            },
          ],
        }
      )
      result.should.deep.equal('blah')
    })
    it('should not collapse NOT', () => {
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
            {
              key: 'blah',
              join: 'not',
              items: [
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
      result.should.deep.equal({
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
          items: [
            {
              key: 'criteria',
              join: 'and',
              items: [
                {
                  key: 'cgnya6ja8ys10iwl8fr',
                  _meta: {
                    filter: 'cable',
                  },
                },
                {
                  key: 'criteria',
                  join: 'or',
                  items: [
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
              items: [
                {
                  key: 'results',
                },
              ],
            },
          ],
        }
      )
      result.should.deep.equal({
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
          items: [
            {
              key: 'criteria',
              join: 'and',
              items: [
                {
                  key: 'cgnya6ja8ys10iwl8fr',
                  _meta: {
                    filter: 'cable',
                  },
                },
                {
                  key: 'criteria',
                  join: 'or',
                  items: [
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
              items: [
                {
                  type: 'group',
                  key: 'analysis',
                  join: 'and',
                  items: [
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
      result.should.deep.equal({
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
          items: [
            {
              key: 'criteria',
              join: 'and',
              items: [
                {
                  key: 'cgnya6ja8ys10iwl8fr',
                  _meta: {
                    filter: 'cable',
                  },
                },
                {
                  key: 'criteria',
                  join: 'or',
                  items: [
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
              items: [
                {
                  type: 'group',
                  key: 'analysis',
                  join: 'and',
                  items: [
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
      result.should.deep.equal('res:FL')
    })
    it('should handle nested AND', () => {
      let result = getRelevantFilters(
        DebugProvider.groupCombinator,
        ['root', 'criteria', 'criteria2', 'dod'],
        {
          key: 'root',
          join: 'and',
          items: [
            {
              key: 'criteria',
              join: 'and',
              items: [
                {
                  key: 'cgnya6ja8ys10iwl8fr',
                  _meta: {
                    filter: 'cable',
                  },
                },
                {
                  key: 'criteria2',
                  join: 'or',
                  items: [
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
              items: [
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
      result.should.deep.equal({
        and: ['cable', 'result'],
      })
    })
  })
})
