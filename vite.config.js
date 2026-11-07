import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
    base: './',
    server: {
        host: '127.0.0.1', // Forces IPv4 to prevent IPv6 localhost connection refusal
        port: 8080,
        allowedHosts: ['.trycloudflare.com'], // Prevents invalid host header errors from Cloudflare
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true
            },
            '/photos': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true
            },
            '/ws': {
                target: 'ws://127.0.0.1:8080',
                ws: true
            }
        }
    },
    build: {
        minify: 'esbuild',
        chunkSizeWarningLimit: 1200,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
            },
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/three')) return 'vendor-three'
                    if (id.includes('/src/engine/') || id.includes('\\src\\engine\\') || id.includes('/src/game/') || id.includes('\\src\\game\\')) return 'engine-3d'
                    if (id.includes('avatarWorld') || id.includes('multiplayer')) return 'avatars-multiplayer'
                },
            },
        },
    },
})