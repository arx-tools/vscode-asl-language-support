import assert from 'node:assert/strict'
import test from 'node:test'
import { decodeScript } from '../../src/asl/encoding.ts'

void test('decodes the latin9 sigils of the corpus', () => {
  const data = new Uint8Array([0x41, 0xa7, 0xa3, 0x20, 0x42])

  assert.equal(decodeScript(data), 'A§£ B')
})

void test('drops the trailing nul byte of the original scripts', () => {
  const data = new Uint8Array([0x41, 0x43, 0x43, 0x45, 0x50, 0x54, 0x00])

  assert.equal(decodeScript(data), 'ACCEPT')
})

void test('keeps the CRLF line endings', () => {
  const data = new Uint8Array([0x41, 0x0d, 0x0a, 0x42])

  assert.equal(decodeScript(data), 'A\r\nB')
})
