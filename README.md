# Contexture

Abstract queries, filters, results, and aggregrations to heterogeneous data stores such as HTTP APIs and databases.

## Ecosystem And Resources

| Github | npm | Desccription |
| ------ | --- | ------------ |
| [`contexture`](http://github.com/smartprocure/contexture) | [`contexture`](https://www.npmjs.com/package/contexture) | The core library that executes a Contexture DSL to retrieve data |
| [`contexture-elasticsearch`](http://github.com/smartprocure/contexture-elasticsearch) | [`contexture-elasticsearch`](https://www.npmjs.com/package/contexture-elasticsearch) | Elasticsearch provider |
| [`contexture-mongo`](http://github.com/smartprocure/contexture-mongo) | [`contexture-mongo`](https://www.npmjs.com/package/contexture-mongo) | MongoDB provider |
| [`contexture-client`](http://github.com/smartprocure/contexture-client) | [`contexture-client`](https://www.npmjs.com/package/contexture-client) | The client library that manages the DSL, allowing for hyper efficient updates running only what is exactly needed |
| [`contexture-react`](http://github.com/smartprocure/contexture-react) | [`contexture-react`](https://www.npmjs.com/package/contexture-react) | React components for building contexture interfaces |
| [`contexture-export`](http://github.com/smartprocure/contexture-export) | [`contexture-export`](https://www.npmjs.com/package/contexture-export) | Export searches into files or any other target |
| [`contexture-ec18-talk`](http://github.com/smartprocure/contexture-ec18-talk) | n/a | Elasticon 2018 Talk About Contexture |

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
      types
    })
  }
})

// Options for the `process` function. They are all optional
let options = {
  // Sends `_meta` as part of the response, which includes per node request 
  // records, relevant filters, and other debug info 
  debug: true,
  // A callback which is called whenever a node finishes producing it's results, 
  // which can be used to send partial results over websockets for example
  onResult: () => {},
}
await process(dsl, options)
```
## Overview

This repository is the Contexture DSL processor, which, given a data store provider (read adapter, wrapper, layer, ...), and a JSON DSL describing the search, executes searches on such data store. The DSL is a tree, very much like a simple abstract syntax tree for boolean logic. Search results are set directly on a cloned version of the DSL tree.

In a Contexture tree, leaf nodes both describe searches and contain their results, while non-leaf nodes represent boolean relationships between leaves. Additionally, leaf nodes can affect each other's searches (e.g. acting as a filter); therefore the name "contexture". The processor is smart enough to make sure that filters are included based on their joins - e.g. two leaves `OR`ed together won't affect each other's results, but they will if they're `AND`ed together.

Contexture typically runs on the server but it doesn't have to - you can build providers that call APIs instead of directly hitting a database. Also, while the Contexture DSL can be built anyway you'd like, it pairs well with [contexture-client](http://github.com/smartprocure/contexture-client), which leverages the generic structure and makes sure things update only when needed.

## Core Concepts

TODO: DSL documentation

A non-leaf node specifies:
- The schema to be used for its subtree (optional except for the root node)
- How its children are combined (or|and)

A leaf node specifies:
- A schema to use (optional)
- A provider (not used and support for it will be dropped)
- A node type
- A unique key
- Other information as needed by the node type

#### Context

TODO: Precise definition, since there are various references to this term:

- `context` as an argument to `runSearch` and friends
- "data context" as mentioned on Node type's `filter`.
- "context" as mentioned in the algorithm
- A node's `context` property as mentioned in the algorithm.

#### Group

A subtree is also called a group

TODO: Precise definition

#### Provider

A `Provider` is an interface to a data store<sup>[1](#DB)</sup> and implements logic specific to the store. A `Provider` module should export:

- `runSearch(options, context, schema, filters, aggregations) -> searchResult`: Run a search against the backend data provider and return its result. It takes the current `context`, `schema`, `filters` (as processed by the `relevantFilters` function and combined with `groupCombinator`), and the criteria for the current context's results (eg `aggs` for an es aggregation or `highlight` for es results). This function can conditionally do different things based on what it is passed - like knowing if it should run an aggregation or a scan/scroll.

- `groupCombinator(group, filters) -> combinedFilters`: Aggregate filters in a backend-dependent way. For example, for a relational DB, the combined filter would be a string, whereas for MongoDB, it would be an object. This function should be associative and commutative.

- `types`: An object of [Node Types](#node-type). It can optionally include a type called `default` whose properties will be used if one of its types are missing something (e.g specifying the default behavior of `validContext` to always allow or prevent results from running).

Additionally, a provider may expose config for it's client (e.g. `hosts` or request `timeout` for elasticsearch).

#### Node Type

Since JSON is not a programmable language, implementation for nodes cannot be defined inline and has to be abstracted. A node's type tells the processor which ([Provider](#provider)-dependent) implementation to use for a given node. For example if the node represents a text value, the text type implementation deals with how to filter a text value and how to make queries for text values. A node type module can export:

- `filter(context) -> filter`: Returns a provider-dependent filter (a string, a function, etc...) that will be applied to other data contexts in the group.

- `result(context, search, schema, provider) -> result`: This is where impurity happens. `search` is `runSearch` with all relevant arguments partially applied so its really easy to run searches. It returns the result of a search. If you need to do additional filtering logic, `runSearch` can be used on the provider directly instead of the conveniently curried version and inspect the `_meta.relevantFilters` property on the node to see which filters would have been auto-applied, allowing you to do any kind of search you want. There hasn't been a need for this yet. This function should log each request on the node's `_meta.requests` property.

- `hasValue`: Determine if the node's own filter should be included<sup>[3](#Checks)</sup>.

- `validContext`: Determine if a search should be run for this node.

All the exports are optional.

All functions can be asynchronous by returning a promise.

#### Schema

A type of data - like a model in an ORM or a Schema in GraphQL. It has one or more<sup>[2](#ManyProviders)</sup> [Providers](#provider), as well as configuration specific to each - things like which index, type, or collection to use and type specific config like how to build a `summaryView` for results or what fields to highlight by default.

Schemas are named by convention based on their filename and should be in `camelCase`. A schema must have one or more provider specific set of configuration properties.

## Processor algorithm

The tree is first cloned and then traversed in pre-order DFS multiple times. Each function can optionally return a promise. Along the way, intermediate data is added to contexts on an object called `_meta`. For each context, every type/processor combination is pulled on the fly, meaning it will use the correct local `Provider` and `Type` info even if some contexts have different schemas<sup>[4](#MultiSchema)</sup>. Tree traversals:

1) Add the following metadata to the node under the `_meta` property:
    - Node's path to root
    - Schema (if specified by the node)
    - Filter as returned by the node's `filter` function if `!node.contextOnly && node.hasValue()`.

2) If the node is a leaf, add its relevant filters to `_meta`. The algorithm for collecting relevant filters is as follow:
    - Prune the current node off the tree.
    - Let `p` be a parent of the current node: prune nodes at `p`'s level that are related to `p` via an `OR` relationship and have different keys than that of `p`.
    - Reduce the pruned tree in a breadth-first, post-order fashion using the current provider's `groupCombinator` function.

3) Set `node.context = node.result()` if `!node.filterOnly && node.validContext()`.

After the above traversals:
- Combine `took` values for all requests to get an accurate number and pass results to `onResult` as they come in if they are defined.
- Unless in `debug` mode, scrub off `_meta` from the response.

<hr>

<a name="DB">1</a> - Does not actually have to be a database - a provider could talk to an API, the file system, or even make stuff up on the fly

<a name="ManyProviders">2</a> - If there are multiple `Providers`, it will default to the first one unless a provider is also specified with the schema on the data context itself

<a name="Checks">3</a> - These checks are above and beyond what the client specifies and are meant as last minute validation - the client is intelligent enough to not send up things without values or missing properties, but this provides an additional check in case something gets through (e.g., a `terms_stats` without a `sort` field).

<a name="MultiSchema">4</a> - This completely solves and obviates the need for the `MultiIndexGroupProcessor` on the client and handles it in much more elegant way (and in a single service call, instead of `n` services calls). A caveat is that it does not currently handle schemas from different providers (because filters are generated based on their context's local schema), so you can't currently mix a elasticsearch schema with a mongo schema (because it could try to call mongo with elastic search filters for example).
