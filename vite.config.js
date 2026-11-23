import { defineConfig } from 'vite'

// host: true + allowedHosts: true — чтобы приложение открывалось в превью-среде
// (прокси вида https://<port>-<sandbox>.e2b.app) и на любом внешнем домене.
// hmr.host НЕ фиксируем: иначе websocket живёт на localhost и в превью не коннектится.
const server = {
  host: true,
  port: 5173,
  strictPort: false,
  cors: true,
  allowedHosts: true,
}

export default defineConfig({
  base: './',
  server,
  preview: { ...server, port: 4173 },
})
