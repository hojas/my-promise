// Promise 的三种状态：等待、完成、拒绝
enum PromiseState {
  PENDING = 'pending',
  FULFILLED = 'fulfilled',
  REJECTED = 'rejected',
}

// Promise 可以处理的值类型
type PromiseValue = any

// Promise 处理器接口，定义了成功和失败的回调函数类型
interface PromiseHandlers<T = PromiseValue> {
  onFulfilled?: (value: T) => any
  onRejected?: (reason: any) => any
}

// 回调接口，扩展了 PromiseHandlers，添加了 resolve 和 reject 方法
interface Callback extends PromiseHandlers {
  resolve: (value?: PromiseValue) => void
  reject: (reason?: any) => void
}

// 工具函数集合
const utils = {
  // 判断是否为函数类型
  // eslint-disable-next-line ts/no-unsafe-function-type
  isFunction(value: any): value is Function {
    return typeof value === 'function'
  },

  // 判断是否为普通对象
  isObject(value: any): value is object {
    return Object.prototype.toString.call(value) === '[object Object]'
  },

  // 判断是否为 thenable（具有 then 方法的对象或函数）
  isThenable(value: any): boolean {
    return (utils.isFunction(value) || utils.isObject(value)) && Reflect.has(value, 'then')
  },

  // 将函数放入宏任务队列异步执行
  // eslint-disable-next-line ts/no-unsafe-function-type
  runAsync(fn: Function) {
    setTimeout(fn, 0)
  },
}

export class MyPromise {
  // 当前 Promise 的状态
  private state = PromiseState.PENDING
  // 当前 Promise 的结果值
  private result: PromiseValue
  // 等待执行的回调函数数组
  private callbacks: Callback[] = []

  // 构造函数，接收一个执行器函数
  constructor(executor: (
    resolve: (value?: PromiseValue) => void,
    reject: (reason?: any) => void
  ) => void) {
    // 状态变更为完成的处理函数
    const onFulfilled = (value: any) => this._transition(PromiseState.FULFILLED, value)
    // 状态变更为拒绝的处理函数
    const onRejected = (reason: any) => this._transition(PromiseState.REJECTED, reason)

    // 确保 resolve/reject 只被调用一次
    let ignore = false
    const resolve = (value: any) => {
      if (ignore)
        return
      ignore = true
      this._resolvePromise(value, onFulfilled, onRejected)
    }
    const reject = (reason: any) => {
      if (ignore)
        return
      ignore = true
      onRejected(reason)
    }

    // 执行器错误处理
    try {
      executor(resolve, reject)
    }
    catch (error) {
      reject(error)
    }
  }

  // then 方法，添加成功和失败的回调
  then(onFulfilled?: PromiseHandlers['onFulfilled'], onRejected?: PromiseHandlers['onRejected']) {
    return new MyPromise((resolve, reject) => {
      const callback: Callback = {
        onFulfilled,
        onRejected,
        resolve,
        reject,
      }

      // 如果当前是等待状态，将回调存入队列
      if (this.state === PromiseState.PENDING) {
        this.callbacks.push(callback)
        return
      }

      // 如果已经完成或拒绝，异步执行回调
      utils.runAsync(() => this._handleCallback(callback))
    })
  }

  // catch 方法，添加错误处理回调
  catch(onRejected?: PromiseHandlers['onRejected']) {
    return this.then(undefined, onRejected)
  }

  // finally 方法，无论成功失败都会执行的回调
  // eslint-disable-next-line ts/no-unsafe-function-type
  finally(callback: Function) {
    return this.then(
      (value: any) => MyPromise.resolve(callback()).then(() => value),
      (reason: any) => MyPromise.reject(callback()).then(() => reason),
    )
  }

  // 处理状态转换
  private _transition(state: PromiseState, result: any) {
    if (this.state !== PromiseState.PENDING)
      return
    this.state = state
    this.result = result

    // 异步执行所有等待中的回调
    utils.runAsync(() => {
      this.callbacks.forEach(callback => this._handleCallback(callback))
      this.callbacks = []
    })
  }

  // 处理单个回调
  private _handleCallback(callback: Callback) {
    const { onFulfilled, onRejected, resolve, reject } = callback

    try {
      // 处理成功状态
      if (this.state === PromiseState.FULFILLED) {
        return utils.isFunction(onFulfilled)
          ? resolve(onFulfilled(this.result))
          : resolve(this.result)
      }
      // 处理失败状态
      if (this.state === PromiseState.REJECTED) {
        return utils.isFunction(onRejected)
          ? resolve(onRejected(this.result))
          : reject(this.result)
      }
    }
    catch (error) {
      return reject(error)
    }
  }

  // 解析 Promise
  private _resolvePromise(
    value: any,
    onFulfilled: NonNullable<PromiseHandlers['onFulfilled']>,
    onRejected: NonNullable<PromiseHandlers['onRejected']>,
  ) {
    // 防止循环引用
    if (value === this) {
      return onRejected(new TypeError('Can not fulfill promise with itself'))
    }
    // 处理 Promise 实例
    if (value instanceof MyPromise) {
      return value.then(onFulfilled, onRejected)
    }
    // 处理 thenable 对象
    if (utils.isThenable(value)) {
      try {
        const then = value.then
        if (utils.isFunction(then)) {
          return new MyPromise(then.bind(value)).then(onFulfilled, onRejected)
        }
      }
      catch (error) {
        return onRejected(error)
      }
    }
    return onFulfilled(value)
  }

  // 创建一个已完成的 Promise
  static resolve(value?: any) {
    return new MyPromise(resolve => resolve(value))
  }

  // 创建一个已拒绝的 Promise
  static reject(reason?: any) {
    return new MyPromise((_, reject) => reject(reason))
  }

  // 并行执行多个 Promise，全部完成才成功，任一失败则失败
  static all<T>(values: T[]): MyPromise {
    return new MyPromise((resolve, reject) => {
      const results: any[] = Array.from({ length: values.length })
      let resolvedCount = 0

      const tryResolve = (index: number, value: any) => {
        results[index] = value
        resolvedCount++
        if (resolvedCount === values.length) {
          resolve(results)
        }
      }

      values.forEach((value, index) => {
        if (value instanceof MyPromise) {
          value.then(
            val => tryResolve(index, val),
            reject,
          )
        }
        else {
          tryResolve(index, value)
        }
      })
    })
  }

  // 竞速处理多个 Promise，返回最先完成的结果
  static race(values: any[]): MyPromise {
    return new MyPromise((resolve, reject) =>
      values.forEach(value =>
        value instanceof MyPromise
          ? value.then(resolve, reject)
          : resolve(value),
      ),
    )
  }

  // 等待所有 Promise 完成，无论成功失败
  static allSettled(values: any[]): MyPromise {
    return new MyPromise((resolve) => {
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
            (res: any) => addPromise(PromiseState.FULFILLED, res, i),
            (err: any) => addPromise(PromiseState.REJECTED, err, i),
          )
          : addPromise(PromiseState.FULFILLED, value, i),
      )
    })
  }

  // 返回第一个成功的 Promise，如果全部失败则拒绝
  static any(values: any[]): MyPromise {
    return new MyPromise((resolve, reject) => {
      let rejectedCount = 0

      values.forEach((value) => {
        value instanceof MyPromise
          ? value.then(
            (val: any) => resolve(val),
            () => {
              rejectedCount++
              if (rejectedCount === values.length) {
                reject('All promises were rejected')
              }
            },
          )
          : resolve(value)
      })
    })
  }
}
