let _ = require('lodash/fp')

module.exports = {
  result: (
    { pageSize = 10, page = 1, sortField, sortDir = 'desc' },
    search
  ) => ({
    totalRecords: search(_.size),
    results: search(
      _.flow(
        _.orderBy(sortField, sortDir),
        pageSize > 0
          ? _.slice((page - 1) * pageSize, page * pageSize)
          : _.identity
      )
    ),
  }),
}
