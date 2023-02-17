import { describe, it } from 'vitest'
import { MyPromise as MyPromise } from '../src/my-promise'

describe('MyPromise methods', () => {
  it('catch()', async ({ expect }) => {
    const p = new MyPromise((_resolve, reject) => reject('p'))
    try {
      await p
    } catch (err) {
      expect(err).toBe('p')
    }
  })

  it('finally()', async ({ expect }) => {
    {
      const p = new MyPromise(resolve => resolve('p'))
      let res = ''
      await p
        .then(res => res)
        .finally(() => {
          res = 'finally'
        })
      expect(res).toBe('finally')
    }

    {
      const p = new MyPromise((_resolve, reject) => reject('p'))
      let res = ''
      await p
        .catch(err => err)
        .finally(() => {
          res = 'finally'
        })
      expect(res).toBe('finally')
    }
  })
})

describe('MyPromise static methods', () => {
  it('resolve()', async ({ expect }) => {
    {
      const res = await MyPromise.resolve(1)
      expect(res).toBe(1)
    }

    {
      const p = new MyPromise(resolve => resolve('p'))
      const res = await MyPromise.resolve(p)
      expect(res).toBe('p')
    }
  })

  it('reject()', async ({ expect }) => {
    try {
      await MyPromise.reject(1)
    } catch (err) {
      expect(err).toBe(1)
    }

    try {
      const p = new MyPromise((_, reject) => reject('p'))
      await MyPromise.reject(p)
    } catch (err) {
      expect(err.result).toBe('p')
    }
  })

  it('all()', async ({ expect }) => {
    {
      const p1 = new MyPromise(resolve => resolve('p1'))
      const p2 = new MyPromise(resolve => resolve('p2'))
      const res = await MyPromise.all([p1, p2])
      expect(JSON.stringify(res)).toBe('["p1","p2"]')
    }

    {
      const p1 = new MyPromise(resolve => resolve('p1'))
      const p2 = 'p2'
      const res = await MyPromise.all([p1, p2])
      expect(JSON.stringify(res)).toBe('["p1","p2"]')
    }
  })

  it('race()', async ({ expect }) => {
    const p1 = new MyPromise(resolve => resolve('p1'))
    const p2 = 'p2'
    const res = await MyPromise.race([p1, p2])
    expect(res).toBe('p2')
  })

  it('any()', async ({ expect }) => {
    {
      const p1 = new MyPromise((_, reject) => reject('p1'))
      const p2 = new MyPromise(resolve => resolve('p2'))
      const res = await MyPromise.any([p1, p2])
      expect(res).toBe('p2')
    }

    {
      const p1 = new MyPromise((_, reject) => reject('p1'))
      const p2 = 'p2'
      const res = await MyPromise.any([p1, p2])
      expect(res).toBe('p2')
    }

    {
      const p1 = new MyPromise((_, reject) => reject('p1'))
      const p2 = new MyPromise((_, reject) => reject('p2'))
      try {
        await MyPromise.any([p1, p2])
      } catch (err) {
        expect(err).toBe('All promises were rejected')
      }
    }
  })

  it('allSettled()', async ({ expect }) => {
    {
      const p1 = new MyPromise(resolve => resolve('p1'))
      const p2 = new MyPromise(resolve => resolve('p2'))
      const res = await MyPromise.allSettled([p1, p2])
      expect(res[0].status).toBe('fulfilled')
      expect(res[0].value).toBe('p1')
      expect(res[1].status).toBe('fulfilled')
      expect(res[1].value).toBe('p2')
    }

    {
      const p1 = new MyPromise(resolve => resolve('p1'))
      const p2 = new MyPromise((_, reject) => reject('p2'))
      const res = await MyPromise.allSettled([p1, p2])
      expect(res[0].status).toBe('fulfilled')
      expect(res[0].value).toBe('p1')
      expect(res[1].status).toBe('rejected')
      expect(res[1].value).toBe('p2')
    }

    {
      const p1 = new MyPromise(resolve => resolve('p1'))
      const p2 = new MyPromise((_, reject) => reject('p2'))
      const p3 = 'p3'
      const res = await MyPromise.allSettled([p1, p2, p3])
      expect(res[0].status).toBe('fulfilled')
      expect(res[0].value).toBe('p1')
      expect(res[1].status).toBe('rejected')
      expect(res[1].value).toBe('p2')
      expect(res[2].status).toBe('fulfilled')
      expect(res[2].value).toBe('p3')
    }
  })
})
