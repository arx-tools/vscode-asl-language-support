// the tokenizer follows the engine's `script::Context`: every byte below or equal to space separates
// the tokens (the parentheses included), `//` cuts the rest of the line, a string is `"..."` without
// an escape character and `~` toggles an interpolation inside and outside of a string.

import { toAsciiLowerCase } from './metadata.ts'
import type { Problem, Token } from './types.ts'

/**
 * The sigils of the variables. The first three are global, the next three are entity local, and the
 * `^` prefix marks a system variable (handled separately).
 */
const VARIABLE_SIGILS = new Set(['#', '&', '$', '§', '@', '£'])

/**
 * The characters that get their own token: the braces for the blocks and the parentheses, which are
 * separators for the engine but stay visible in the editor.
 */
const PUNCTUATION_CHARACTERS = new Set(['(', ')', '{', '}'])

/**
 * The token kinds that can be an operand of a comparison.
 */
const OPERAND_KINDS = new Set(['word', 'variable', 'systemVariable', 'number', 'string', 'interpolation'])

/**
 * The token kinds that can be the target of a `set`.
 */
const VARIABLE_KINDS = new Set(['variable', 'systemVariable'])

/**
 * The pattern of a number.
 */
const NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/

/**
 * The pattern of a flag word (`-abc`).
 */
const FLAG_PATTERN = /^-[a-z]+$/

/**
 * The state of one line while it is tokenized.
 */
type LexerState = {
  /**
   * The text of the line.
   */
  text: string
  /**
   * The line number, used for the problems.
   */
  line: number
  /**
   * The offset of the next character to read.
   */
  index: number
  /**
   * The tokens that are read so far.
   */
  tokens: Token[]
  /**
   * The problems that are found so far.
   */
  problems: Problem[]
}

/**
 * The tokens and the problems of a line.
 */
export type LineTokenization = {
  /**
   * The tokens of the line.
   */
  tokens: Token[]
  /**
   * The problems of the line.
   */
  problems: Problem[]
}

/**
 * Tells whether the character separates two tokens, like `isWhitespace()` in the engine.
 */
function isSeparator(character: string): boolean {
  return character <= ' ' || character === '(' || character === ')'
}

/**
 * Tells whether the character ends a word.
 *
 * The braces are handled as their own tokens, even though the engine only separates them by the
 * whitespace: a `{` glued to a word is already broken, because `FindScriptPos()` requires a
 * separator after the event name.
 */
function isWordTerminator(character: string): boolean {
  return isSeparator(character) || character === '{' || character === '}' || character === '"'
}

/**
 * Records a problem.
 */
function addProblem(state: LexerState, problem: Omit<Problem, 'line'>): void {
  state.problems.push({ ...problem, line: state.line })
}

/**
 * Creates a closed token.
 */
function createToken(kind: Token['kind'], text: string, start: number, end: number): Token {
  return { kind, text, value: toAsciiLowerCase(text), start, end, closed: true }
}

/**
 * Classifies a word by its first character and its shape.
 */
function classifyWord(text: string, start: number, end: number): Token {
  const firstCharacter = text[0] ?? ''

  if (firstCharacter === '^') {
    return createToken('systemVariable', text, start, end)
  }

  if (VARIABLE_SIGILS.has(firstCharacter)) {
    return createToken('variable', text, start, end)
  }

  if (FLAG_PATTERN.test(toAsciiLowerCase(text))) {
    return createToken('flag', text, start, end)
  }

  if (NUMBER_PATTERN.test(text)) {
    return createToken('number', text, start, end)
  }

  return createToken('word', text, start, end)
}

/**
 * Reads a quoted string. The string ends at the closing quote or at the end of the line, an escape
 * character does not exist.
 */
function readString(state: LexerState): void {
  const { text } = state
  const start = state.index
  let index = start + 1
  let tildes = 0
  let closed = false

  while (index < text.length) {
    const character = text[index]

    if (character === '~') {
      tildes = tildes + 1
      index = index + 1
      continue
    }

    if (character === '"') {
      closed = true
      index = index + 1
      break
    }

    index = index + 1
  }

  if (!closed) {
    addProblem(state, {
      code: 'unterminated-string',
      category: 'strings',
      severity: 'warning',
      message: 'The string is not closed before the end of the line.',
      start,
      end: text.length,
    })
  }

  if (tildes % 2 === 1) {
    addProblem(state, {
      code: 'unmatched-interpolation',
      category: 'strings',
      severity: 'warning',
      message: 'The `~` interpolation is not closed.',
      start,
      end: index,
    })
  }

  state.tokens.push({ ...createToken('string', text.slice(start, index), start, index), closed })
  state.index = index
}

/**
 * Reads a bare `~name~` interpolation.
 */
function readInterpolation(state: LexerState): void {
  const { text } = state
  const start = state.index
  let index = start + 1

  while (index < text.length && text[index] !== '~' && !isWordTerminator(text[index])) {
    index = index + 1
  }

  const closed = index < text.length && text[index] === '~'

  if (closed) {
    index = index + 1
  } else {
    addProblem(state, {
      code: 'unmatched-interpolation',
      category: 'strings',
      severity: 'warning',
      message: 'The `~` interpolation is not closed.',
      start,
      end: index,
    })
  }

  state.tokens.push({ ...createToken('interpolation', text.slice(start, index), start, index), closed })
  state.index = index
}

/**
 * Reads a `>>label` token. A `>>` without a name is left alone.
 */
function readLabel(state: LexerState): void {
  const { text } = state
  const start = state.index
  let index = start + 2

  while (index < text.length && !isWordTerminator(text[index])) {
    index = index + 1
  }

  if (index === start + 2) {
    state.index = index
    return
  }

  state.tokens.push(createToken('label', text.slice(start + 2, index), start + 2, index))
  state.index = index
}

/**
 * Reads a plain word. The word can contain a `~name~` interpolation, which is kept inside the word,
 * because the engine interpolates a part of the word as well.
 */
function readWord(state: LexerState): void {
  const { text } = state
  const start = state.index
  let index = start
  let tildes = 0

  while (index < text.length) {
    const character = text[index]

    if (isWordTerminator(character)) {
      break
    }

    if (character === '/' && text[index + 1] === '/') {
      break
    }

    if (character === '~') {
      tildes = tildes + 1
    }

    index = index + 1
  }

  if (index === start) {
    state.index = index + 1
    return
  }

  if (tildes % 2 === 1) {
    addProblem(state, {
      code: 'unmatched-interpolation',
      category: 'strings',
      severity: 'warning',
      message: 'The `~` interpolation is not closed.',
      start,
      end: index,
    })
  }

  state.tokens.push(classifyWord(text.slice(start, index), start, index))
  state.index = index
}

/**
 * Tokenizes one line of the document.
 */
export function tokenizeLine(text: string, line: number): LineTokenization {
  const state: LexerState = { text, line, index: 0, tokens: [], problems: [] }

  while (state.index < text.length) {
    const character = text[state.index]

    if (PUNCTUATION_CHARACTERS.has(character)) {
      state.tokens.push(createToken('punctuation', character, state.index, state.index + 1))
      state.index = state.index + 1
      continue
    }

    if (isSeparator(character)) {
      state.index = state.index + 1
      continue
    }

    if (character === '/' && text[state.index + 1] === '/') {
      state.tokens.push(createToken('comment', text.slice(state.index), state.index, text.length))
      break
    }

    if (character === '"') {
      readString(state)
      continue
    }

    if (character === '>' && text[state.index + 1] === '>') {
      readLabel(state)
      continue
    }

    if (character === '~') {
      readInterpolation(state)
      continue
    }

    readWord(state)
  }

  return { tokens: state.tokens, problems: state.problems }
}

/**
 * Tells whether the token can be an operand of a comparison.
 */
export function isOperand(token: Token): boolean {
  return OPERAND_KINDS.has(token.kind)
}

/**
 * Tells whether the token can be the target of a `set`.
 */
export function isVariable(token: Token): boolean {
  return VARIABLE_KINDS.has(token.kind)
}
