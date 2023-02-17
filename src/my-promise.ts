enum STATE {
  PENDING = 'pending',
  FULFILLED = 'fulfilled',
  REJECTED = 'rejected',
}

type ResolveFn = (value?: any) => void
type RejectFn = (reason?: any) => void
type FulfilledFn = (data?: any) => any
type RejectedFn = (err?: any) => any
type PromiseExecutor = (resolve: ResolveFn, reject: RejectFn) => void

interface Callback {
  resolve: ResolveFn
  reject: RejectFn
  onFulfilled?: FulfilledFn
  onRejected?: RejectedFn
}

const isFunction = (value: any): value is Function =>
  typeof value === 'function'

const isObject = (value: any): value is Object =>
  Object.prototype.toString.call(value) === '[object Object]'

const isThenable = (thenable: any): boolean =>
  (isFunction(thenable) || isObject(thenable)) && 'then' in thenable

export class MyPromise {
  state = STATE.PENDING
  result: any
  callbacks: Callback[] = []

  constructor(executor: PromiseExecutor) {
    const onFulfilled = (value: any) => this._transition(STATE.FULFILLED, value)
    const onRejected = (reason: any) => this._transition(STATE.REJECTED, reason)

    let ignore = false
    const resolve = (value: any) => {
      if (ignore) return
      ignore = true
      this._resolvePromise(value, onFulfilled, onRejected)
    }
    const reject = (reason: any) => {
      if (ignore) return
      ignore = true
      onRejected(reason)
    }

    try {
      executor(resolve, reject)
    } catch (error) {
      reject(error)
    }
  }

  then(onFulfilled?: FulfilledFn, onRejected?: RejectedFn) {
    return new MyPromise((resolve, reject) => {
      const callback: Callback = {
        onFulfilled,
        onRejected,
        resolve,
        reject,
      }
      if (this.state === STATE.PENDING) {
        this.callbacks.push(callback)
        return
      }
      setTimeout(() => this._handleCallback(callback), 0)
    })
  }

  catch(onRejected?: RejectedFn) {
    return this.then(undefined, onRejected)
  }

  finally(callback: Function) {
    return this.then(
      (value: any) => MyPromise.resolve(callback()).then(() => value),
      (reason: any) => MyPromise.reject(callback()).then(() => reason)
    )
  }

  private _transition(state: STATE, result: any) {
    if (this.state !== STATE.PENDING) return
    this.state = state
    this.result = result

    setTimeout(() => {
      this.callbacks.forEach(callback => this._handleCallback(callback))
      this.callbacks = []
    }, 0)
  }

  private _handleCallback(callback: Callback) {
    const { onFulfilled, onRejected, resolve, reject } = callback

    try {
      if (this.state === STATE.FULFILLED) {
        return isFunction(onFulfilled)
          ? resolve(onFulfilled(this.result))
          : resolve(this.result)
      }
      if (this.state === STATE.REJECTED) {
        return isFunction(onRejected)
          ? resolve(onRejected(this.result))
          : reject(this.result)
      }
    } catch (error) {
      return reject(error)
    }
  }

  private _resolvePromise(
    value: any,
    onFulfilled: FulfilledFn,
    onRejected: RejectedFn
  ) {
    if (value === this) {
      return onRejected(new TypeError('Can not fulfill promise with itself'))
    }
    if (value instanceof MyPromise) {
      return value.then(onFulfilled, onRejected)
    }
    if (isThenable(value)) {
      try {
        const then = value.then
        if (isFunction(then)) {
          return new MyPromise(then.bind(value)).then(onFulfilled, onRejected)
        }
      } catch (error) {
        return onRejected(error)
      }
    }
    return onFulfilled(value)
  }

  static resolve(value?: any) {
    return new MyPromise(resolve => resolve(value))
  }

  static reject(reason?: any) {
    return new MyPromise((_, reject) => reject(reason))
  }

  static all(values: any[]) {
    return new MyPromise((resolve, reject) => {
      const len = values.length
      const result: any[] = new Array(len)
      let count = 0

      const addPromise = (key: number, item: any) => {
        result[key] = item
        count++
        if (count === len) {
          resolve(result)
        }
      }

      values.forEach((value, i) => {
        value instanceof MyPromise
          ? value.then(
              val => addPromise(i, val),
              reason => reject(reason)
            )
          : addPromise(i, value)
      })
    })
  }

  static race(values: any[]) {
    return new MyPromise((resolve, reject) =>
      values.forEach(value =>
        value instanceof MyPromise
          ? value.then(resolve, reject)
          : resolve(value)
      )
    )
  }

  static allSettled(values: any[]) {
    return new MyPromise(resolve => {
      const resolveDataList: any[] = []
      let resolvedCount = 0

      const addPromise = (status: string, value: any, i: number) => {
        resolveDataList[i] = { status, value }
        resolvedCount++
        if (resolvedCount === values.length) {
          resolve(resolveDataList)
        }
      }

      values.forEach((value: any, i: number) =>
        value instanceof MyPromise
          ? value.then(
              (res: any) => addPromise(STATE.FULFILLED, res, i),
              (err: any) => addPromise(STATE.REJECTED, err, i)
            )
          : addPromise(STATE.FULFILLED, value, i)
      )
    })
  }

  static any(values: any[]) {
    return new MyPromise((resolve, reject) => {
      let rejectedCount = 0

      values.forEach(value => {
        value instanceof MyPromise
          ? value.then(
              (val: any) => resolve(val),
              () => {
                rejectedCount++
                if (rejectedCount === values.length) {
                  reject('All promises were rejected')
                }
              }
            )
          : resolve(value)
      })
    })
  }
}
