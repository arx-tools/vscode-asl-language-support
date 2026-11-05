import assert from 'node:assert/strict'
import test from 'node:test'
import { getFoldingRanges } from '../../src/asl/folding.ts'
import { parseDocument } from '../../src/asl/parser.ts'

void test('folds the balanced brace pairs', () => {
  const text = ['ON INIT {', '  IF (x == 1) {', '  }', '}'].join('\n')

  assert.deepEqual(getFoldingRanges(parseDocument(text)), [
    { startLine: 0, endLine: 3, kind: 'event' },
    { startLine: 1, endLine: 2, kind: 'block' },
  ])
})

void test('folds an event from the on line', () => {
  const text = ['ON INIT', '{', '  ACCEPT', '}'].join('\n')

  assert.deepEqual(getFoldingRanges(parseDocument(text)), [
    { startLine: 0, endLine: 3, kind: 'event' },
    { startLine: 1, endLine: 3, kind: 'block' },
  ])
})

void test('does not fold a brace pair on one line', () => {
  assert.deepEqual(getFoldingRanges(parseDocument('IF (x == 1) { ACCEPT }')), [])
})
