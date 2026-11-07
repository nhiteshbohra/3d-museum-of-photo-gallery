// =========================================================================
// EMPIRICAL REPRODUCTION: disconnectNet() Normal Closure (Code 1000) Reconnect Loop
// Demonstrates that calling disconnectNet() does NOT suppress reconnect,
// but instead triggers an automatic background reconnection loop after 1000ms.
// =========================================================================

import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'
import { connectNet, disconnectNet, netConnected } from '../src/net/wsClient.js'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

test('DISCONNECT-LEAK-01: disconnectNet() must NOT trigger an automatic reconnect loop', async () => {
  const PORT = 8996
  const server = createServer()
  const wss = new WebSocketServer({ server })
  let connectionCount = 0

  wss.on('connection', ws => {
    connectionCount++
  })

  await new Promise(res => server.listen(PORT, res))

  try {
    // 1. Client connects intentionally
    const ws = connectNet(`ws://127.0.0.1:${PORT}`)
    assert.ok(ws, 'Initial connection created')
    await sleep(200)
    assert.strictEqual(connectionCount, 1, 'Initial connection received by server')
    assert.strictEqual(netConnected(), true, 'Client is marked connected')

    // 2. Client intentionally calls disconnectNet()
    disconnectNet()
    assert.strictEqual(netConnected(), false, 'Client is marked disconnected')

    // 3. Wait 1600ms (exceeding initial reconnect delay of 1000ms)
    await sleep(1600)

    // 4. Assert: Server must NOT receive a second connection attempt!
    assert.strictEqual(
      connectionCount,
      1,
      `BUG: disconnectNet() triggered unexpected reconnect! Expected 1 connection, got ${connectionCount}`
    )
  } finally {
    disconnectNet()
    for (const client of wss.clients) {
      try { client.terminate() } catch {}
    }
    await new Promise(res => wss.close(res))
    await new Promise(res => server.close(res))
  }
})
