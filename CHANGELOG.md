### 0.12.5
* Ensure _meta is stripped from filterOnly nodes / nodes without valid context if debug option is falsy

### 0.12.4
* Revert parallelization until we can make it configurable and test more thoroughly

### 0.12.3
* Converted tests to jest

### 0.12.2
* Updated CI to use node16 and npm7
* Updated package-lock.json to version 2

### 0.12.1
* Performance: executing runSearch requests in parallel

### 0.12.0
* Add last 1 Day and last 1 hour to date math calculations

### 0.11.3
* Changed over CI from circleCI to Github Actions.

### 0.11.2
* Cleanup packag-lock.json
* Fix unit test:  Date example type test cases - lastCalendarMonth
  * this is a permant fix as it lock the date for the tests
* Refactored date test to make use of bdd-lazy-var

### 0.11.1
* Fix unit test:  Date example type test cases - lastCalendarMonth 

### 0.11.0
* Export fn to attach _meta.filters to search nodes

### 0.10.0
* Add next18Months rolling memory date type option

### 0.9.4
* Fix memory date type and add tests

### 0.9.3
* Fix memory facet `exclude` mode & add test

### 0.9.2
* Fix memory exists to work & add test cases for exists & bool types

### 0.9.1
* Memory facet type: handle dotted paths

### 0.9.0
* Memory facet type
    * Unwind results
    * Support non-primitive values when counting results
    * Preserve types of results when filtering them
* Memory results type: do not paginate if pageSize = 0

### 0.8.3
* Bump duti

### 0.8.2
* Fix memory facet type to respect optionsFilter when provided

### 0.8.1
* Fix issue with filter on provider-memory bool type

### 0.8.0
* Add support for date math operations on provider-memory date type

### 0.7.1
* Fix "Desccription" typo to "Description"

### 0.7.0
* Pass the node and path in `onResult`, not the raw context value
* Optimize performance by reducing the number of tree traversals
* Clean up repo by using new `futil` methods instead of local utils
* General refactoring

### 0.6.1
* Fix `raw` function

### 0.6.0
* Add global `raw` example type
* Chore: move from `futil-js` to `futil`

### 0.5.2
* Memory Provider: Fix bug in results type pagination

### 0.5.1
* Documentation: Define DSL

### 0.5.0
* Memory Provider: Add `totalRecords` to `results` example type

### 0.4.2
* Throw Error object instead of just the error message

### 0.4.1
* Pass schemas along in subquery type
* Add missing hasValue functions for subquery and savedSearch

### 0.4.0
* Memory Provider: Add savedSearch type
* Memory Provider: Add subquery type
* Memory Provider: Facet now coerces values to strings (since number options are strings anyway)
* Added facet export data strategy

### 0.3.1
* Refactoring

### 0.3.0
* Add memory provider and tests

### 0.2.1
* Pass `schema` to more step functions

### 0.2.0
* Flatten legacy fields, so `data` and `config` (and their more modern `filterConfig` and `resultConfig` aliases) are merged into the nodes so types can safely ignore the distinction

### 0.1.0
* Supporting `children`.

### 0.0.5
* Ecosystem And Resources readme update (version bump for npm pubishing)

### 0.0.4
* Pass getProvider and getSchema to result functions

### 0.0.3
* Fixed some core bugs, added better tests, and moved to async/await

### 0.0.2

* Add CI configuration and other developer tooling

### 0.0.1

* Initial release
