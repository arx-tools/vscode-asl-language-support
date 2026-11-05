import assert from 'node:assert/strict'
import test from 'node:test'
import { analyze, type AnalysisOptions } from '../../src/asl/analysis.ts'
import { parseDocument } from '../../src/asl/parser.ts'

/**
 * Runs the analysis on a text.
 */
function analyzeText(text: string, options?: AnalysisOptions): ReturnType<typeof analyze> {
  return analyze(parseDocument(text), options)
}

/**
 * Returns the codes of the problems of a text.
 */
function getCodes(text: string, options?: AnalysisOptions): string[] {
  return analyzeText(text, options).map((problem) => {
    return problem.code
  })
}

void test('reports an unknown command with a suggestion', () => {
  const problems = analyzeText(['ON INIT {', '  SETMATERIALS 1', '  ACCEPT', '}'].join('\n'))

  assert.equal(problems.length, 1)
  assert.equal(problems[0]?.code, 'unknown-command')
  assert.match(problems[0]?.message ?? '', /`setmaterial`/)
  assert.equal(problems[0]?.line, 1)
})

void test('accepts the timer pseudo commands', () => {
  assert.deepEqual(getCodes(['ON INIT {', '  TIMERwait -m 0 1 ACCEPT', '}'].join('\n')), [])
})

void test('accepts the commands with underscores', () => {
  assert.deepEqual(getCodes(['ON INIT {', '  SET_MATERIAL stone', '  ACCEPT', '}'].join('\n')), [])
})

void test('reports a set without a variable target', () => {
  const problems = analyzeText(['ON INIT {', '  SET SHADOW OFF', '  ACCEPT', '}'].join('\n'))

  assert.deepEqual(
    problems.map((problem) => {
      return problem.code
    }),
    ['set-without-variable'],
  )
})

void test('accepts a set with a system variable target', () => {
  assert.deepEqual(getCodes(['ON INIT {', '  SET ^life 1', '  ACCEPT', '}'].join('\n')), [])
})

void test('reports an if with two words', () => {
  assert.deepEqual(getCodes(['ON INIT {', '  IF x==1 {', '  }', '  ACCEPT', '}'].join('\n')), ['if-needs-operands'])
})

void test('reports an unknown if operator', () => {
  const problems = analyzeText(['ON INIT {', '  IF (x <> 1) {', '  }', '  ACCEPT', '}'].join('\n'))

  assert.deepEqual(
    problems.map((problem) => {
      return problem.code
    }),
    ['if-unknown-operator'],
  )
})

void test('accepts the known if operators', () => {
  assert.deepEqual(
    getCodes(['IF (x isclass 3) {', '}', 'IF ($a isin $b) {', '}', 'IF (x !isgroup 3) {', '}'].join('\n')),
    [],
  )
})

void test('reports a missing label', () => {
  const problems = analyzeText(['ON INIT {', '  GOTO nowhere', '  ACCEPT', '}'].join('\n'))

  assert.deepEqual(
    problems.map((problem) => {
      return problem.code
    }),
    ['missing-label'],
  )
})

void test('ignores a dynamic label reference', () => {
  assert.deepEqual(getCodes(['ON INIT {', '  GOSUB ~£temp~', '  ACCEPT', '}'].join('\n')), [])
})

void test('reports a duplicate label', () => {
  const problems = analyzeText(['ON INIT {', '  ACCEPT', '}', '>>start', '  ACCEPT', '>>start', '  ACCEPT'].join('\n'))

  assert.deepEqual(
    problems.map((problem) => {
      return problem.code
    }),
    ['duplicate-label'],
  )
})

void test('reports a duplicate event', () => {
  const problems = analyzeText(['ON INIT {', '  ACCEPT', '}', 'ON INIT {', '  ACCEPT', '}'].join('\n'))

  assert.deepEqual(
    problems.map((problem) => {
      return problem.code
    }),
    ['duplicate-event'],
  )
})

void test('reports an unclosed brace as a structure problem', () => {
  assert.deepEqual(getCodes(['ON INIT {', '  ACCEPT'].join('\n')), ['unclosed-brace'])
})

void test('reports the missing terminator only when it is switched on', () => {
  const text = ['ON INIT {', '  SET §x 1', '}'].join('\n')
  const withTerminator = analyzeText(text, {
    commands: true,
    structure: true,
    references: true,
    strings: true,
    missingTerminator: true,
  })

  assert.deepEqual(
    withTerminator.map((problem) => {
      return problem.code
    }),
    ['missing-terminator'],
  )
  assert.equal(withTerminator[0]?.severity, 'information')
  assert.deepEqual(getCodes(text), [])
})

void test('respects the switches of the analysis', () => {
  const text = ['ON INIT {', '  SETMATERIALS 1', '  SET SHADOW OFF', '  ACCEPT', '}'].join('\n')

  assert.deepEqual(
    getCodes(text, { commands: false, structure: true, references: true, strings: true, missingTerminator: false }),
    [],
  )
})

void test('reports the string problems through the analysis', () => {
  assert.deepEqual(getCodes(['ON INIT {', '  SETNAME "oops', '  ACCEPT', '}'].join('\n')), ['unterminated-string'])
})
