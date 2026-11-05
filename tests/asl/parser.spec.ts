import assert from 'node:assert/strict'
import test from 'node:test'
import { parseDocument } from '../../src/asl/parser.ts'

/**
 * The document that most of the tests use.
 */
const SAMPLE = [
  'ON INIT {',
  '  SET §counter 0',
  '  ACCEPT',
  '}',
  '',
  'ON CUSTOM {',
  '  IF (^$param1 == "start") {',
  '    GOSUB do_start',
  '  }',
  '  ACCEPT',
  '}',
  '',
  '>>do_start',
  '  TIMERwait -m 500 1 GOTO done',
  '  RETURN',
  '',
  '>>done',
  '  ACCEPT',
].join('\r\n')

void test('parses the events of the document', () => {
  const document = parseDocument(SAMPLE)

  assert.deepEqual(
    document.events.map((event) => {
      return [event.name, event.line, event.openBraceLine, event.closeLine]
    }),
    [
      ['INIT', 0, 0, 3],
      ['CUSTOM', 5, 5, 10],
    ],
  )
})

void test('finds the brace of the event on the next line', () => {
  const document = parseDocument(['ON INIT', '{', '  ACCEPT', '}'].join('\n'))

  assert.equal(document.events[0]?.openBraceLine, 1)
  assert.equal(document.events[0]?.closeLine, 3)
})

void test('reports an event without a brace', () => {
  const document = parseDocument(['ON INIT', '  ACCEPT', '}'].join('\n'))

  assert.equal(document.events[0]?.openBraceLine, null)
  assert.deepEqual(
    document.problems.map((problem) => {
      return problem.code
    }),
    // the closing brace of the skipped block has no pair either
    ['stray-brace', 'missing-event-brace'],
  )
})

void test('collects the labels and the references', () => {
  const document = parseDocument(SAMPLE)

  assert.deepEqual(
    document.labels.map((label) => {
      return [label.name, label.line]
    }),
    [
      ['do_start', 12],
      ['done', 16],
    ],
  )
  assert.deepEqual(
    document.references.map((reference) => {
      return [reference.kind, reference.target, reference.line, reference.dynamic]
    }),
    [
      ['gosub', 'do_start', 7, false],
      // the timer stores the rest of the line, so the goto is a reference as well
      ['goto', 'done', 13, false],
    ],
  )
})

void test('marks a dynamic label reference', () => {
  const document = parseDocument('GOSUB ~£target~\n')

  assert.equal(document.references[0]?.dynamic, true)
})

void test('collects the assigned variables once', () => {
  const document = parseDocument(['SET §x 1', 'SET §x 2', 'SET $y "a"'].join('\n'))

  assert.deepEqual(
    document.variables.map((variable) => {
      return [variable.name, variable.line, variable.first]
    }),
    [
      ['§x', 0, true],
      ['§x', 1, false],
      ['$y', 2, true],
    ],
  )
})

void test('collects the first command of the lines', () => {
  const document = parseDocument(SAMPLE)

  assert.deepEqual(
    document.statements.map((statement) => {
      return [statement.value, statement.line]
    }),
    [
      ['set', 1],
      ['accept', 2],
      ['if', 6],
      ['gosub', 7],
      ['accept', 9],
      ['timerwait', 13],
      ['return', 14],
      ['accept', 17],
    ],
  )
})

void test('pairs the braces', () => {
  const document = parseDocument(['{', '  {', '  }', '}'].join('\n'))

  assert.equal(document.braces.length, 4)
  assert.equal(document.braces[0]?.match, 3)
  assert.equal(document.braces[1]?.match, 2)
  assert.equal(document.problems.length, 0)
})

void test('reports a stray and an unclosed brace', () => {
  const document = parseDocument(['}', '{'].join('\n'))

  assert.deepEqual(
    document.problems.map((problem) => {
      return problem.code
    }),
    ['stray-brace', 'unclosed-brace'],
  )
})

void test('computes the brace depth of the events', () => {
  const document = parseDocument(['ON INIT {', '  IF (x == 1) {', '  }', '}'].join('\n'))

  assert.equal(document.events[0]?.depth, 0)
})

void test('marks the underscore disabled events and labels', () => {
  const document = parseDocument(['ON _OLD {', '  ACCEPT', '}', '>>_dead', '  ACCEPT'].join('\n'))

  assert.equal(document.events[0]?.disabled, true)
  assert.equal(document.labels[0]?.disabled, true)
})

void test('ignores a line that starts with a comment', () => {
  const document = parseDocument('// SETMATERIAL stone\n')

  assert.deepEqual(document.statements, [])
})

void test('parses an empty document', () => {
  const document = parseDocument('')

  assert.equal(document.lines.length, 1)
  assert.deepEqual(document.events, [])
  assert.deepEqual(document.problems, [])
})
