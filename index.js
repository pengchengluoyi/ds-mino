import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import http from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const NEXUS = process.env.DS_MINO_NEXUS || 'http://127.0.0.1:50104'

const root = fileURLToPath(new URL('./lib/assets/app', import.meta.url))
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.zip': 'application/zip',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
}

export const name = 'ds-mino'

function send(res, file) {
  const type = types[extname(file)] || 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' })
  createReadStream(file).pipe(res)
}

function proxyApi(req, res) {
  const incoming = new URL(String(req.url || '/'), 'http://localhost')
  const stripped = incoming.pathname.replace(/^\/ds-mino-api/, '') || '/'
  const target = new URL(stripped + incoming.search, NEXUS)
  const headers = { ...req.headers, host: target.host }
  delete headers['transfer-encoding']
  const upstream = http.request(target, { method: req.method, headers }, (incomingRes) => {
    res.writeHead(incomingRes.statusCode || 502, incomingRes.headers)
    incomingRes.pipe(res)
  })
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('无法连接服务器')
  })
  req.pipe(upstream)
}

export function apply(ctx) {
  ctx.inject(['webServer'], (host) => {
    host.effect(() => host.webServer.register({
      kind: 'prefix',
      path: '/ds-mino-api',
      handler: (req, res) => proxyApi(req, res),
    }), 'ds-mino api')
    host.effect(() => host.webServer.register({
      kind: 'prefix',
      path: '/ds-mino/',
      handler: async (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405)
          res.end()
          return
        }
        const pathname = new URL(String(req.url || '/'), 'http://localhost').pathname
        let rel = decodeURIComponent(pathname.replace(/^\/ds-mino\/?/, ''))
        if (!rel) rel = 'index.html'
        const file = normalize(join(root, rel))
        if (!file.startsWith(root)) {
          res.writeHead(403)
          res.end()
          return
        }
        try {
          const info = await stat(file)
          const target = info.isDirectory() ? join(file, 'index.html') : file
          if (req.method === 'HEAD') {
            res.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream' })
            res.end()
            return
          }
          send(res, target)
        } catch {
          if (!extname(rel)) {
            send(res, join(root, 'index.html'))
            return
          }
          res.writeHead(404)
          res.end()
        }
      },
    }), 'ds-mino files')
  })
}
