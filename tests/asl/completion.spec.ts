import assert from 'node:assert/strict'
import test from 'node:test'
import { getCompletions, type CompletionEntry } from '../../src/asl/completion.ts'
import { parseDocument } from '../../src/asl/parser.ts'

/**
 * Returns the completions of a position.
 */
function complete(text: string, line: number, character: number): CompletionEntry[] {
  return getCompletions(parseDocument(text), line, character)
}

/**
 * Finds a completion by its label.
 */
function findEntry(entries: CompletionEntry[], label: string): CompletionEntry | undefined {
  return entries.find((entry) => {
    return entry.label === label
  })
}

void test('completes the commands at the start of a line', () => {
  const entries = complete('', 0, 0)

  assert.notStrictEqual(findEntry(entries, 'ACCEPT'), undefined)
  assert.notStrictEqual(findEntry(entries, 'SETMATERIAL'), undefined)
  assert.equal(findEntry(entries, 'ACCEPT')?.kind, 'command')
})

void test('filters the commands by the prefix', () => {
  const entries = complete('SETM', 0, 4)

  assert.notStrictEqual(findEntry(entries, 'SETMATERIAL'), undefined)
  assert.equal(findEntry(entries, 'ACCEPT'), undefined)
})

void test('completes the events after on', () => {
  const entries = complete('ON ', 0, 3)

  assert.notStrictEqual(findEntry(entries, 'INIT'), undefined)
  assert.equal(findEntry(entries, 'NULL'), undefined)
  assert.equal(findEntry(entries, 'INIT')?.kind, 'event')
})

void test('completes the labels after goto', () => {
  const entries = complete(['>>start', 'GOTO '].join('\n'), 1, 5)

  assert.notStrictEqual(findEntry(entries, 'start'), undefined)
  assert.equal(findEntry(entries, 'start')?.kind, 'label')
})

void test('completes the variables of the document after set', () => {
  const entries = complete(['SET §counter 0', 'SET '].join('\n'), 1, 4)

  assert.notStrictEqual(findEntry(entries, '§counter'), undefined)
  assert.equal(findEntry(entries, '§counter')?.kind, 'variable')
})

void test('completes the subcommands of inventory', () => {
  const entries = complete('INVENTORY ', 0, 10)

  assert.notStrictEqual(findEntry(entries, 'ADD'), undefined)
  assert.notStrictEqual(findEntry(entries, 'PLAYERADDMULTI'), undefined)
  assert.equal(findEntry(entries, 'ADD')?.kind, 'subcommand')
})

void test('completes the system variables inside an interpolation', () => {
  const text = 'SETNAME "~^"'
  const entries = complete(text, 0, 11)

  assert.notStrictEqual(findEntry(entries, '^life'), undefined)
})

void test('does not complete inside a string', () => {
  assert.deepEqual(complete('SETNAME "ab"', 0, 11), [])
})

void test('does not complete inside a comment', () => {
  assert.deepEqual(complete('// SETMAT', 0, 9), [])
})

void test('does not complete in the argument of a command', () => {
  assert.deepEqual(complete('SETMATERIAL st', 0, 15), [])
})
