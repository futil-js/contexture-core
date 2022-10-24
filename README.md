# contexture

The Contexture DSL (Domain Specific Language) Processor

## Overview

Contexture is a tool for running the Contexture DSL, which is primarily about abstracting queries/filters and results/aggregrations.
Each leaf node in a Contexture Tree can affect other leaf nodes (e.g., acting as a filter) and has results of it's own (e.g. a top N aggregation or search results) which are affected by the other nodes.
Non leaf nodes describe how leaves relate to each other, e.g. as a boolean join of `and`/`or`, and Contexture is smart enough to make sure that filters are included based on their joins - e.g. two nodes `or`ed together won't affect each other's results, but they will if they're `and`ed together.

The canonical example of a Contexture Node is faceted search, where you have a checkbox list that is both a filter (restricts results to things checked) and an aggregation (show the top n values which can be checked). Contexture allows them to be nested in advanced searches with boolean joins like `and`/`or`/`not`.

Contexture takes as input the tree DSL and returns it hydrated with contextual results on it's `context`, and uses `provider`s for different backing data stores (like elasticsearch and mongo) to actually run the search results. This means that Contexture typically runs on the server, but it doesn't have to - you can build providers that call APIs instead of directly hitting a database.
While the Contexture DSL can be built anyway you'd like, it pairs well with the `contexture-client`, which leverages the generic structure and makes sure things update only when needed.

### Ecosystem And Resources

| Github                                                                                | npm                                                                                  | Description                                                                                                       |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| [`contexture`](http://github.com/smartprocure/contexture)                             | [`contexture`](https://www.npmjs.com/package/contexture)                             | The core library that exectues the DSL to retrieve data                                                           |
| [`contexture-elasticsearch`](http://github.com/smartprocure/contexture-elasticsearch) | [`contexture-elasticsearch`](https://www.npmjs.com/package/contexture-elasticsearch) | Elasticsearch provider for contexture                                                                             |
| [`contexture-mongo`](http://github.com/smartprocure/contexture-mongo)                 | [`contexture-mongo`](https://www.npmjs.com/package/contexture-mongo)                 | MongoDB provider for contexture                                                                                   |
| [`contexture-client`](http://github.com/smartprocure/contexture-client)               | [`contexture-client`](https://www.npmjs.com/package/contexture-client)               | The client library that manages the DSL, allowing for hyper efficient updates running only what is exactly needed |
| [`contexture-react`](http://github.com/smartprocure/contexture-react)                 | [`contexture-react`](https://www.npmjs.com/package/contexture-react)                 | React components for building contexture interfaces                                                               |
| [`contexture-export`](http://github.com/smartprocure/contexture-export)               | [`contexture-export`](https://www.npmjs.com/package/contexture-export)               | Export searches into files or any other target                                                                    |
| [`contexture-ec18-talk`](http://github.com/smartprocure/contexture-ec18-talk)         | n/a                                                                                  | Elasticon 2018 Talk About Contexture                                                                              |

## Example Usage

```js
let Contexture = require('contexture')
let provider = require('contexture-mongo')
let types = require('contexture-mongo/types')
let schemas = require('./path/to/schemas')

let process = Contexture({
  schemas,
  providers: {
    mongo: provider({
      getMongooseClient: () => mongoose,
      types,
    }),
  },
})
```

Then later:

```js
await process(dsl)
```

or

```js
await process(dsl, {
  debug: true,
})
```

## Process Options

Process can handle a few options:

| Option     | Description                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `debug`    | Sends `_meta` as part of the response, which includes per node request records, relevant filters, and other debug info                            |
| `onResult` | A callback which is called whenever a node finishes producing it's results, which can be used to send partial results over websockets for example |

## Core Concepts

### Overview

`Contexture` will process a serialized contexture tree dsl, where each leaf node has a `Schema` representing what it is querying and which data `Provider` it uses, along with a `Provider`-specific `Type` that defines how it applies `filter`s to other contexts and how it interacts with its `Provider` to get `results`.

#### Glossary

- Schema

  - A `Schema` represents a type of data - like a model in an ORM or a Schema in GraphQL. It has one or more[^manyproviders] `Providers` to tie it to a real data source, and well as configuration specific to each `Provider` - things like which index, type, or collection to use and type specific config like how to build a `summaryView` for results or what fields to highlight by default.-

- Provider

  - A `Provider` contains all of the database[^db] specific logic, including how to actually run a search (`runSearch`), how to combine filters in a group (`groupCombinator`), any client specific configuration (which in practice is overridden/injected at runtime from sails config), and implementations for all of its `Types`

- Type
  - A `Type` is an implementation of a specific node type for a given `Provider`. It can include functions to produce a filter (`filter`), how it interacts with the `Provider`'s search function to generate results (`result`), and checks[^checks] to determine if a filter should be included (`hasValue`) or if results should be run (`validContext`). All of the methods are optional - some node types only have filters (like `bool` or `number`), some only have results (like `dateHistogram` and `terms_stats`), and others have both (like `facet`). All of the functions can be asynchronous by returning a promise, allowing more complex filters like the `geo` filter which can geocode addresses on the fly.

[^db]: Does not actually have to be a database - a provider could talk to an API, the file system, or even make stuff up on the fly
[^checks]: These checks are above and beyond what the client specifies and are meant as last minute validation - the client is intelligent enough to not send up things without values or missing properties, but this provides an additional check in case something gets through (e.g., a `terms_stats` without a `sort` field).
[^manyproviders]: If there are multiple `Providers`, it will default to the first one unless a provider is also specified with the schema on the data context itself

## Implementation Details

### Process Algorithm

For each of these steps, walk the tree in a parent-first DFS traversal, with each function optionally asynchronous by returning a promise. Along the way, intermediate data is added to contexts on an object called `_meta`. For each context, every type/processor combination is pulled on the fly, meaning it will use the correct local `Provider` and `Type` info even if some contexts have different schemas[^multischema]

- Clean/Prep everything (adding `_meta`, etc)
- Add `materializedPaths` (used later by `relevantFilters`)
- Run `filter` for each item if it `hasValue`
- Add `relevantFilters` for each item (all filters combined in their groups by the `groupCombinator` except for their own filters and any filters related to them in the tree via an `OR`
- Get `result` for each item if it `hasValidContext` and is not `filterOnly` (as determined by the client event architecture), passing a pre curried search function that includes `relevantFilters` so types don't need to worry about it - logging each request on `_meta.requests`
- Combine `took` values for all requests to get an accurate number and pass results to `onResult` as they come in if they are defined
- Unless in `debug` mode, scrub off `_meta` from the response

### Providers

All `Provider` must specify the following properties:

- `groupCombinator`
  - A function that takes the group and an array of its filters and returns them combined.
- `runSearch`
  - A function that actually runs the search. It takes the current context, schema, filters (as processed by the `relevantFilters` function and combined with `groupCombinators`), and the criteria for the current context's results (eg `aggs` for an es aggregation or `highlight` for es results). This function can conditionally do different things based on what it is passed - like knowing if it should run an aggregation or a scan/scroll.
- `types`
  - A object hash of the `Provider`'s type implementations. It can optionally include a type called `default` whose properties will be used if one of its types are missing something (e.g specifying the default behavior of `validContext` to always allow or prevent results from running)

Additionally, a provider may expose config for it's client (e.g. `hosts` or request `timeout` for elasticsearch).

### Types

All `Types` can implement any if the following properties. All are optional:

- `filter`
  - Takes the current context and produces the filter that will apply to other data contexts in the group (except those related via `OR`). Typically JSON but can be a string as in the SQL case.
- `hasValue`
  - Takes the current context and returns a truthy value for whether or not it has a value
- `result`
  - Takes the current context, a curried version of the provider's `runSearch` with filters and everything pre-applied (so it is really easy to run searches), the current schema, and the current provider for advanced use cases. This can run one or more async calls - as long as it returns a promise for the final result. If you need to do additional filtering logic, you can use `runSearch` on the provider directly instead of the convenient curried version and inspect the `_meta.relevantFilters` property to see which filters would have been auto-applied, allowing you to do literally any kind of search you want - but there hasn't been a need for this yet.
- `validContext`
  - Takes the current context and returns a truthy value for whether or not it should get results.

[^multischema]: This completely solves and obviates the need for the `MultiIndexGroupProcessor` on the client and handles it in much more elegant way (and in a single service call, instead of `n` services calls). A caveat is that it does not currently handle schemas from different providers (because filters are generated based on their context's local schema), so you can't currently mix a elasticsearch schema with a mongo schema (because it could try to call mongo with elastic search filters for example).

### Schemas

Schemas are named by convention based on their filename and should be in `camelCase`. A schema must have one or more provider specific set of configuration properties.
