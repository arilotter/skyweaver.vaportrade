import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path'

export default defineConfig({
    plugins: [
        dts({ insertTypesEntry: true }),
    ],
    build: {
        sourcemap: true,
        lib: {
            entry: resolve(__dirname, 'index.ts'),
            name: 'shared'
        },
    },
});