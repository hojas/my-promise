import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/my-promise.ts'),
      name: 'MyPromise',
      fileName: 'my-promise',
    },
  },
})
