import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import http from 'node:http'
import https from 'node:https'
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

/** Pick the HTTP client matching the configured Nexus origin. */
function requestFor(target) {
  return target.protocol === 'https:' ? https.request : http.request
}

const LOCAL_ORIGIN = /^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/

function allowedOrigin(req, origin) {
  if (origin === 'dsh-app://app') return true
  if (LOCAL_ORIGIN.test(origin)) return true
  const host = req.headers.host
  return !!host && (origin === `http://${host}` || origin === `https://${host}`)
}

function corsHeaders(req) {
  const origin = req.headers.origin
  if (!origin || !allowedOrigin(req, origin)) return {}
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || 'authorization,content-type,x-mino-client,accept',
    'Access-Control-Max-Age': '600',
    'Access-Control-Expose-Headers': 'content-disposition,content-length',
    Vary: 'Origin',
  }
  if (req.headers['access-control-request-private-network'] === 'true') {
    headers['Access-Control-Allow-Private-Network'] = 'true'
  }
  return headers
}

function proxyApi(req, res) {
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') {
    res.writeHead(cors['Access-Control-Allow-Origin'] ? 204 : 403, cors)
    res.end()
    return
  }
  const incoming = new URL(String(req.url || '/'), 'http://localhost')
  const stripped = incoming.pathname.replace(/^\/ds-mino-api/, '') || '/'
  const target = new URL(stripped + incoming.search, NEXUS)
  const headers = { ...req.headers, host: target.host, origin: target.origin }
  delete headers['transfer-encoding']
  delete headers.referer
  const upstream = requestFor(target)(target, { method: req.method, headers }, (incomingRes) => {
    const outgoing = { ...incomingRes.headers, ...cors }
    const upstreamVary = incomingRes.headers.vary
    if (cors.Vary && upstreamVary) {
      outgoing.Vary = `${Array.isArray(upstreamVary) ? upstreamVary.join(', ') : upstreamVary}, Origin`
    }
    res.writeHead(incomingRes.statusCode || 502, outgoing)
    incomingRes.pipe(res)
  })
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8', ...cors })
    res.end('无法连接服务器')
  })
  req.pipe(upstream)
}

/** Write an HTTP handshake response back to the browser socket. */
function writeUpgradeHead(socket, statusCode, statusMessage, rawHeaders) {
  const lines = [`HTTP/1.1 ${statusCode} ${statusMessage || ''}`]
  for (let i = 0; i < rawHeaders.length; i += 2) {
    lines.push(`${rawHeaders[i]}: ${rawHeaders[i + 1]}`)
  }
  socket.write(`${lines.join('\r\n')}\r\n\r\n`)
}

/**
 * Proxy the workbench realtime WebSocket. dsh-host-webserver only matches
 * exact upgrade paths, so this handler owns `/ds-mino-api/ws` and forwards the
 * handshake to Nexus while keeping the browser talking to the same origin.
 */
function proxyUpgrade(req, socket, head) {
  const incoming = new URL(String(req.url || '/'), 'http://localhost')
  const stripped = incoming.pathname.replace(/^\/ds-mino-api/, '') || '/'
  const target = new URL(stripped + incoming.search, NEXUS)
  const headers = { ...req.headers, host: target.host, origin: target.origin }
  delete headers['transfer-encoding']
  const upstream = requestFor(target)(target, { method: req.method || 'GET', headers })

  upstream.on('upgrade', (incomingRes, upstreamSocket, upstreamHead) => {
    writeUpgradeHead(socket, incomingRes.statusCode || 101, incomingRes.statusMessage || 'Switching Protocols', incomingRes.rawHeaders)
    if (upstreamHead?.length) socket.write(upstreamHead)
    if (head?.length) upstreamSocket.write(head)
    upstreamSocket.pipe(socket)
    socket.pipe(upstreamSocket)
    upstreamSocket.on('error', () => socket.destroy())
    socket.on('error', () => upstreamSocket.destroy())
    upstreamSocket.on('close', () => socket.destroy())
    socket.on('close', () => upstreamSocket.destroy())
  })

  // Nexus refused the upgrade (401, wrong path, ...): relay the response so the
  // browser sees a real handshake failure instead of a silent hang.
  upstream.on('response', (incomingRes) => {
    writeUpgradeHead(socket, incomingRes.statusCode || 502, incomingRes.statusMessage || '', incomingRes.rawHeaders)
    incomingRes.pipe(socket)
  })

  upstream.on('error', () => socket.destroy())
  upstream.end()
}

export function apply(ctx) {
  try {
  ctx.inject(['webServer'], (host) => {
    try {
    host.effect(() => host.webServer.register({
      kind: 'prefix',
      path: '/ds-mino-api',
      handler: (req, res) => proxyApi(req, res),
    }), 'ds-mino api')
    host.effect(() => host.webServer.register({
      kind: 'prefix',
      path: '/ds-mino',
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
    host.effect(() => host.webServer.registerUpgrade({
      path: '/ds-mino-api/ws',
      handler: (req, socket, head) => proxyUpgrade(req, socket, head),
    }), 'ds-mino websocket')
    } catch (error) {}
  })
  } catch (error) {}
}
