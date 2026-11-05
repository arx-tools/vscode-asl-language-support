import assert from 'node:assert/strict'
import test from 'node:test'
import { getHover, type HoverResult } from '../../src/asl/hover.ts'
import { parseDocument } from '../../src/asl/parser.ts'

/**
 * Returns the hover of a position.
 */
function hover(text: string, line: number, character: number): HoverResult | null {
  return getHover(parseDocument(text), line, character)
}

void test('describes a command', () => {
  const result = hover('SETMATERIAL stone', 0, 2)

  assert.ok(result)
  assert.match(result.contents, /SETMATERIAL/)
  assert.match(result.contents, /command/)
  assert.match(result.contents, /material of the mesh/)
  assert.equal(result.start, 0)
  assert.equal(result.end, 11)
})

void test('describes an event', () => {
  const result = hover('ON INIT {', 0, 4)

  assert.ok(result)
  assert.match(result.contents, /INIT/)
  assert.match(result.contents, /built-in event/)
})

void test('describes a label', () => {
  const result = hover(['ON INIT {', '  ACCEPT', '}', '>>start'].join('\n'), 3, 3)

  assert.ok(result)
  assert.match(result.contents, />>start/)
  assert.match(result.contents, /label/)
})

void test('describes a variable', () => {
  const result = hover('SET §counter 0', 0, 5)

  assert.ok(result)
  assert.match(result.contents, /§counter/)
  assert.match(result.contents, /entity integer variable/)
  assert.match(result.contents, /line 1/)
})

void test('describes a system variable', () => {
  const result = hover('SET ^life 1', 0, 5)

  assert.ok(result)
  assert.match(result.contents, /system variable/)
})

void test('resolves the hover of a goto target', () => {
  const result = hover(['>>start', 'GOTO start'].join('\n'), 1, 6)

  assert.ok(result)
  assert.match(result.contents, /Defined at line 1/)
})

void test('reports a missing label on the hover', () => {
  const result = hover('GOTO nowhere', 0, 6)

  assert.ok(result)
  assert.match(result.contents, /missing label/)
})

void test('has no hover for a number', () => {
  assert.equal(hover('SETMATERIAL 0.5', 0, 14), null)
})

void test('has no hover for an unknown word', () => {
  assert.equal(hover('SETMATERIAL stone', 0, 14), null)
})
