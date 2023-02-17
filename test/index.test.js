const { MyPromise } = require('../dist/my-promise.umd.js')

MyPromise.deferred = function () {
  const result = {}
  result.promise = new MyPromise(function (resolve, reject) {
    result.resolve = resolve
    result.reject = reject
  })
  return result
}

module.exports = MyPromise
