import { defineConfig } from 'rollup'
import { terser } from 'rollup-plugin-terser'
import esbuild from 'rollup-plugin-esbuild'
import fileSize from 'rollup-plugin-filesize'
import dts from 'rollup-plugin-dts'

const { production } = process.env

const bundle = defineConfig({
  input: 'src/index.ts',
  output: { dir: 'dist', format: 'es' },
  plugins: production ? [esbuild(), terser(), fileSize()] : [esbuild()],
})

const types = defineConfig({
  input: 'src/index.ts',
  output: [{ dir: 'dist', format: 'es' }],
  plugins: [dts()],
})

export default production ? [bundle, types] : bundle
