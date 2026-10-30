import { defineConfig } from 'vite'

export default defineConfig({
	base: './',
	build: {
		minify: 'esbuild',
		chunkSizeWarningLimit: 1200,
	},
})
