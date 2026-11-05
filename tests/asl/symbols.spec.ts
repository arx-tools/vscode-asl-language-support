import assert from 'node:assert/strict'
import test from 'node:test'
import { parseDocument } from '../../src/asl/parser.ts'
import { getDocumentSymbols } from '../../src/asl/symbols.ts'

/**
 * The document that the tests use.
 */
const SAMPLE = [
  'ON INIT {',
  '  GOSUB setup',
  '  ACCEPT',
  '}',
  '',
  'ON CUSTOM {',
  '  ACCEPT',
  '}',
  '',
  '>>setup',
  '  RETURN',
].join('\n')

void test('lists the events with their labels', () => {
  const symbols = getDocumentSymbols(parseDocument(SAMPLE))

  assert.deepEqual(
    symbols.map((symbol) => {
      return [symbol.name, symbol.kind, symbol.children.length]
    }),
    [
      ['INIT', 'event', 0],
      ['CUSTOM', 'event', 0],
      ['setup', 'label', 0],
    ],
  )
})

void test('nests a label into the event that contains it', () => {
  const text = ['ON INIT {', '  >>inner', '  ACCEPT', '}'].join('\n')
  const symbols = getDocumentSymbols(parseDocument(text))

  assert.equal(symbols[0]?.children.length, 1)
  assert.equal(symbols[0]?.children[0]?.name, 'inner')
})

void test('marks the disabled and the custom events in the detail', () => {
  const text = ['ON _OLD {', '}', 'ON REPAIRED {', '}'].join('\n')
  const symbols = getDocumentSymbols(parseDocument(text))

  assert.equal(symbols[0]?.detail, 'disabled event')
  assert.equal(symbols[1]?.detail, 'event')
})
