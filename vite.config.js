import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
    base: './',
    server: {
        host: '127.0.0.1', // Forces IPv4 to prevent IPv6 localhost connection refusal
        port: 5173,
        allowedHosts: ['.trycloudflare.com'] // Prevents invalid host header errors from Cloudflare
    },
    build: {
        minify: 'esbuild',
        chunkSizeWarningLimit: 1200,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
            },
        },
    },
})