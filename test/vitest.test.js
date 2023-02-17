import { describe, it } from 'vitest'
import { MyPromise as TinyPromise } from '../src/my-promise'

describe('TinyPromise methods', () => {
  it('catch()', async ({ expect }) => {
    const p = new TinyPromise((_resolve, reject) => reject('p'))
    try {
      await p
    } catch (err) {
      expect(err).toBe('p')
    }
  })

  it('finally()', async ({ expect }) => {
    {
      const p = new TinyPromise(resolve => resolve('p'))
      let res = ''
      await p
        .then(res => res)
        .finally(() => {
          res = 'finally'
        })
      expect(res).toBe('finally')
    }

    {
      const p = new TinyPromise((_resolve, reject) => reject('p'))
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

describe('TinyPromise static methods', () => {
  it('resolve()', async ({ expect }) => {
    {
      const res = await TinyPromise.resolve(1)
      expect(res).toBe(1)
    }

    {
      const p = new TinyPromise(resolve => resolve('p'))
      const res = await TinyPromise.resolve(p)
      expect(res).toBe('p')
    }
  })

  it('reject()', async ({ expect }) => {
    try {
      await TinyPromise.reject(1)
    } catch (err) {
      expect(err).toBe(1)
    }

    try {
      const p = new TinyPromise((_, reject) => reject('p'))
      await TinyPromise.reject(p)
    } catch (err) {
      expect(err.result).toBe('p')
    }
  })

  it('all()', async ({ expect }) => {
    {
      const p1 = new TinyPromise(resolve => resolve('p1'))
      const p2 = new TinyPromise(resolve => resolve('p2'))
      const res = await TinyPromise.all([p1, p2])
      expect(JSON.stringify(res)).toBe('["p1","p2"]')
    }

    {
      const p1 = new TinyPromise(resolve => resolve('p1'))
      const p2 = 'p2'
      const res = await TinyPromise.all([p1, p2])
      expect(JSON.stringify(res)).toBe('["p1","p2"]')
    }
  })

  it('race()', async ({ expect }) => {
    const p1 = new TinyPromise(resolve => resolve('p1'))
    const p2 = 'p2'
    const res = await TinyPromise.race([p1, p2])
    expect(res).toBe('p2')
  })

  it('any()', async ({ expect }) => {
    {
      const p1 = new TinyPromise((_, reject) => reject('p1'))
      const p2 = new TinyPromise(resolve => resolve('p2'))
      const res = await TinyPromise.any([p1, p2])
      expect(res).toBe('p2')
    }

    {
      const p1 = new TinyPromise((_, reject) => reject('p1'))
      const p2 = 'p2'
      const res = await TinyPromise.any([p1, p2])
      expect(res).toBe('p2')
    }

    {
      const p1 = new TinyPromise((_, reject) => reject('p1'))
      const p2 = new TinyPromise((_, reject) => reject('p2'))
      try {
        await TinyPromise.any([p1, p2])
      } catch (err) {
        expect(err).toBe('All promises were rejected')
      }
    }
  })

  it('allSettled()', async ({ expect }) => {
    {
      const p1 = new TinyPromise(resolve => resolve('p1'))
      const p2 = new TinyPromise(resolve => resolve('p2'))
      const res = await TinyPromise.allSettled([p1, p2])
      expect(res[0].status).toBe('fulfilled')
      expect(res[0].value).toBe('p1')
      expect(res[1].status).toBe('fulfilled')
      expect(res[1].value).toBe('p2')
    }

    {
      const p1 = new TinyPromise(resolve => resolve('p1'))
      const p2 = new TinyPromise((_, reject) => reject('p2'))
      const res = await TinyPromise.allSettled([p1, p2])
      expect(res[0].status).toBe('fulfilled')
      expect(res[0].value).toBe('p1')
      expect(res[1].status).toBe('rejected')
      expect(res[1].value).toBe('p2')
    }

    {
      const p1 = new TinyPromise(resolve => resolve('p1'))
      const p2 = new TinyPromise((_, reject) => reject('p2'))
      const p3 = 'p3'
      const res = await TinyPromise.allSettled([p1, p2, p3])
      expect(res[0].status).toBe('fulfilled')
      expect(res[0].value).toBe('p1')
      expect(res[1].status).toBe('rejected')
      expect(res[1].value).toBe('p2')
      expect(res[2].status).toBe('fulfilled')
      expect(res[2].value).toBe('p3')
    }
  })
})
