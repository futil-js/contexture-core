let { expect } = require('chai')
let _ = require('lodash/fp')
let Contexture = require('../src/index')
let provider = require('../src/provider-debug')

let log = {
  stringify: (...args) => console.log(JSON.stringify(...args)),
  json: (...args) => args.forEach(x => log.stringify(x, null, 2))
}

describe('Contexture Core', () => {
  it('should work', async () => {
    let process = Contexture({
      schemas: {
        test: {
          debug: true
        }
      },
      providers: {
        debug: provider
      }
    })

    let dsl = {
      key: 'root',
      type: 'group',
      schema: 'test',
      // join: 'and',
      items: [ //children??
        {
          key: 'filter',
          type: 'test',
          data: {
            value: 1
          }
        },
        {
          key: 'results',
          type: 'results'
        }
      ]
    }

    let result1 = await process(dsl)
    expect(result1.items[0].context).to.deep.equal({
      abc: 123
    })
    expect(result1.items[1].context).to.deep.equal({
      results: []
    })
  })
})