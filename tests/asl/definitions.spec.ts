import assert from 'node:assert/strict'
import test from 'node:test'
import { getDefinition } from '../../src/asl/definitions.ts'
import { parseDocument } from '../../src/asl/parser.ts'

/**
 * Returns the definition of a position.
 */
function define(text: string, line: number, character: number): ReturnType<typeof getDefinition> {
  return getDefinition(parseDocument(text), line, character)
}

void test('jumps from a goto to the label', () => {
  assert.deepEqual(define(['>>start', 'GOTO start'].join('\n'), 1, 6), { line: 0, start: 2, end: 7 })
})

void test('jumps from a gosub to the label', () => {
  assert.deepEqual(define(['>>sub', 'GOSUB sub'].join('\n'), 1, 7), { line: 0, start: 2, end: 5 })
})

void test('jumps from a variable to the first assignment', () => {
  assert.deepEqual(define(['SET §x 1', 'SET §x 2'].join('\n'), 1, 5), { line: 0, start: 4, end: 6 })
})

void test('has no definition for a dynamic reference', () => {
  assert.equal(define('GOSUB ~£temp~', 0, 7), null)
})

void test('has no definition for a missing label', () => {
  assert.equal(define('GOTO nowhere', 0, 6), null)
})

void test('has no definition for a command', () => {
  assert.equal(define('GOTO nowhere', 0, 2), null)
})
