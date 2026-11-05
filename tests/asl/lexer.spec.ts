import assert from 'node:assert/strict'
import test from 'node:test'
import { isOperand, isVariable, tokenizeLine } from '../../src/asl/lexer.ts'

void test('tokenizes a command line with the parentheses as separators', () => {
  const { tokens, problems } = tokenizeLine('  IF (^$PARAM1 == "Appear") ACCEPT', 0)

  assert.equal(problems.length, 0)
  assert.deepEqual(
    tokens.map((token) => {
      return [token.kind, token.text]
    }),
    [
      ['word', 'IF'],
      ['punctuation', '('],
      ['systemVariable', '^$PARAM1'],
      ['word', '=='],
      ['string', '"Appear"'],
      ['punctuation', ')'],
      ['word', 'ACCEPT'],
    ],
  )
})

void test('keeps the offsets of the tokens', () => {
  const { tokens } = tokenizeLine('  SET §x 1', 3)

  assert.deepEqual(
    tokens.map((token) => {
      return [token.text, token.start, token.end]
    }),
    [
      ['SET', 2, 5],
      ['§x', 6, 8],
      ['1', 9, 10],
    ],
  )
})

void test('cuts the comment in the middle of a word', () => {
  const { tokens } = tokenizeLine('SET §x 1//comment', 0)

  assert.deepEqual(
    tokens.map((token) => {
      return [token.kind, token.text]
    }),
    [
      ['word', 'SET'],
      ['variable', '§x'],
      ['number', '1'],
      ['comment', '//comment'],
    ],
  )
})

void test('reads a label without the >>', () => {
  const { tokens } = tokenizeLine('>>start', 0)

  assert.equal(tokens.length, 1)
  assert.equal(tokens[0]?.kind, 'label')
  assert.equal(tokens[0]?.text, 'start')
  assert.equal(tokens[0]?.start, 2)
})

void test('classifies the variables by their sigil', () => {
  const { tokens } = tokenizeLine('§a £b @c #d &e $f ^life ^$param1', 0)

  assert.deepEqual(
    tokens.map((token) => {
      return [token.kind, token.text]
    }),
    [
      ['variable', '§a'],
      ['variable', '£b'],
      ['variable', '@c'],
      ['variable', '#d'],
      ['variable', '&e'],
      ['variable', '$f'],
      ['systemVariable', '^life'],
      ['systemVariable', '^$param1'],
    ],
  )
})

void test('classifies the numbers and the flags', () => {
  const { tokens } = tokenizeLine('PLAYANIM -E 0.8 -1.5 100', 0)

  assert.deepEqual(
    tokens.map((token) => {
      return [token.kind, token.text]
    }),
    [
      ['word', 'PLAYANIM'],
      ['flag', '-E'],
      ['number', '0.8'],
      ['number', '-1.5'],
      ['number', '100'],
    ],
  )
})

void test('keeps a glued comparison as one word', () => {
  const { tokens } = tokenizeLine('IF (x==1) {', 0)

  assert.deepEqual(
    tokens.map((token) => {
      return [token.kind, token.text]
    }),
    [
      ['word', 'IF'],
      ['punctuation', '('],
      ['word', 'x==1'],
      ['punctuation', ')'],
      ['punctuation', '{'],
    ],
  )
})

void test('reads a string with an interpolation inside', () => {
  const { tokens, problems } = tokenizeLine('SETNAME "hello ~£name~"', 0)

  assert.equal(problems.length, 0)
  assert.equal(tokens.length, 2)
  assert.equal(tokens[1]?.kind, 'string')
  assert.equal(tokens[1]?.closed, true)
})

void test('reports an unterminated string', () => {
  const { tokens, problems } = tokenizeLine('SETNAME "hello', 0)

  assert.equal(tokens[1]?.closed, false)
  assert.deepEqual(
    problems.map((problem) => {
      return problem.code
    }),
    ['unterminated-string'],
  )
})

void test('reports an unmatched tilde', () => {
  const { problems } = tokenizeLine('SETNAME "hel~lo"', 0)

  assert.deepEqual(
    problems.map((problem) => {
      return problem.code
    }),
    ['unmatched-interpolation'],
  )
})

void test('reads a bare interpolation', () => {
  const { tokens } = tokenizeLine('GOTO ~£temp~', 0)

  assert.deepEqual(
    tokens.map((token) => {
      return [token.kind, token.text]
    }),
    [
      ['word', 'GOTO'],
      ['interpolation', '~£temp~'],
    ],
  )
})

void test('reports an unterminated interpolation', () => {
  const { problems } = tokenizeLine('GOTO ~£temp', 0)

  assert.deepEqual(
    problems.map((problem) => {
      return problem.code
    }),
    ['unmatched-interpolation'],
  )
})

void test('accepts the operands and the variables', () => {
  const { tokens } = tokenizeLine('§x ^life "text" 5 name', 0)

  assert.deepEqual(
    tokens.map((token) => {
      return isOperand(token)
    }),
    [true, true, true, true, true],
  )
  assert.equal(isVariable(tokens[0] ?? tokens[0]), true)
  assert.equal(isVariable(tokens[4] ?? tokens[4]), false)
})

void test('tokenizes an empty line into nothing', () => {
  const { tokens } = tokenizeLine('', 0)

  assert.deepEqual(tokens, [])
})
