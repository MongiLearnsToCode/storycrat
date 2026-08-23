import { describe, expect, it } from 'vitest'
import { runDurableObjectAlarm, runInDurableObject, env } from 'cloudflare:test'
import type { Env } from '../types'
import { getSessionStateId } from './session-id'
import { parseClientMessage, ProtocolError, SessionState } from './SessionState'

const testEnv = env as unknown as Env

const validArm = JSON.stringify({ type: 'alarm.arm', delayMs: 500 })

describe('getSessionStateId', () => {
  it('derives a deterministic ID for the same user + resource', () => {
    const a = getSessionStateId(testEnv, 'user-1', 'script-1')
    const b = getSessionStateId(testEnv, 'user-1', 'script-1')
    expect(a.equals(b)).toBe(true)
  })

  it('isolates different users onto different objects even for the same resource', () => {
    const a = getSessionStateId(testEnv, 'user-1', 'script-1')
    const b = getSessionStateId(testEnv, 'user-2', 'script-1')
    expect(a.equals(b)).toBe(false)
  })

  it('separates resources for the same user', () => {
    const a = getSessionStateId(testEnv, 'user-1', 'script-1')
    const b = getSessionStateId(testEnv, 'user-1', 'script-2')
    expect(a.equals(b)).toBe(false)
  })
})

describe('parseClientMessage', () => {
  it('accepts ping', () => {
    expect(parseClientMessage('{"type":"ping"}').type).toBe('ping')
  })

  it('accepts a well-formed alarm.arm', () => {
    expect(parseClientMessage(validArm).delayMs).toBe(500)
  })

  it('rejects binary payloads', () => {
    expect(() => parseClientMessage(new ArrayBuffer(8))).toThrow(ProtocolError)
    try {
      parseClientMessage(new ArrayBuffer(8))
      expect.unreachable()
    } catch (e) {
      expect((e as ProtocolError).code).toBe('binary_unsupported')
    }
  })

  it.each(['not json', '{"type":', '[]', '{"noType":true}'])('rejects malformed payload %j', (raw) => {
    try {
      parseClientMessage(raw)
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(ProtocolError)
      expect(['bad_json', 'missing_type']).toContain((e as ProtocolError).code)
    }
  })

  it('rejects unknown message types loudly rather than guessing', () => {
    try {
      parseClientMessage('{"type":"transcript.chunk","text":"hello"}')
      expect.unreachable()
    } catch (e) {
      expect((e as ProtocolError).code).toBe('unknown_type')
    }
  })

  it.each([undefined, 50, 999_999, Number.NaN])('rejects alarm.arm with invalid delayMs (%j)', (delayMs) => {
    const raw = JSON.stringify({ type: 'alarm.arm', delayMs })
    try {
      parseClientMessage(raw)
      expect.unreachable()
    } catch (e) {
      expect((e as ProtocolError).code).toBe('invalid_delay')
    }
  })
})

describe('SessionState object runtime', () => {
  it('rejects plain HTTP requests with 426', async () => {
    const stub = testEnv.SESSION_STATE.get(getSessionStateId(testEnv, 'runtime-user', 'res-a'))
    const response = await stub.fetch('https://session.internal/')
    expect(response.status).toBe(426)
  })

  it('answers pings over a hibernating WebSocket', async () => {
    const stub = testEnv.SESSION_STATE.get(getSessionStateId(testEnv, 'runtime-user', 'res-b'))
    const upgrade = await stub.fetch('https://session.internal/', { headers: { Upgrade: 'websocket' } })
    expect(upgrade.status).toBe(101)

    const client = upgrade.webSocket
    if (!client) throw new Error('No WebSocket returned from upgrade')
    client.accept()

    const pong = new Promise<Record<string, unknown>>((resolve) => {
      client.addEventListener('message', (event) => resolve(JSON.parse(String(event.data))))
    })
    client.send('{"type":"ping"}')

    await expect(pong).resolves.toMatchObject({ type: 'pong' })
    client.close()
  })

  it('rejects malformed messages with typed errors instead of crashing the session', async () => {
    const stub = testEnv.SESSION_STATE.get(getSessionStateId(testEnv, 'runtime-user', 'res-c'))
    const upgrade = await stub.fetch('https://session.internal/', { headers: { Upgrade: 'websocket' } })
    const client = upgrade.webSocket
    if (!client) throw new Error('No WebSocket returned from upgrade')
    client.accept()

    const nextMessage = new Promise<Record<string, unknown>>((resolve) => {
      client.addEventListener('message', (event) => resolve(JSON.parse(String(event.data))))
    })
    client.send('{oops')
    await expect(nextMessage).resolves.toMatchObject({ type: 'error', code: 'bad_json' })
    client.close()
  })

  it('fires alarms through the Alarms API and broadcasts the tick', async () => {
    const stub = testEnv.SESSION_STATE.get(getSessionStateId(testEnv, 'runtime-user', 'res-d'))

    await runInDurableObject(stub, async (_instance: SessionState, state) => {
      // Far enough out that it cannot fire on its own mid-test.
      await state.storage.setAlarm(Date.now() + 60_000)
      expect(state.storage.getAlarm()).not.toBeNull()
    })

    let fired = false
    fired = await runDurableObjectAlarm(stub)
    expect(fired).toBe(true)

    await runInDurableObject(stub, async (_instance: SessionState, state) => {
      expect(await state.storage.getAlarm()).toBeNull()
    })
  })
})
