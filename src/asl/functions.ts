// the helpers that more than one module of the language service uses. everything here works on the
// parsed types, so it stays testable without the `vscode` module.

import { isOperand } from './lexer.ts'
import type { DocumentLine, Token } from './types.ts'

/**
 * Returns the token that contains the position.
 */
export function findTokenAt(tokens: Token[], character: number): Token | undefined {
  return tokens.find((token) => {
    return token.start <= character && character <= token.end
  })
}

/**
 * Returns the number of the given character in a text.
 */
export function countCharacter(text: string, character: string): number {
  let count = 0

  for (const candidate of text) {
    if (candidate === character) {
      count = count + 1
    }
  }

  return count
}

/**
 * Returns the tokens of a line without the comment.
 */
export function getCodeTokens(line: DocumentLine): Token[] {
  return line.tokens.filter((token) => {
    return token.kind !== 'comment'
  })
}

/**
 * Finds the operands of a command on a line.
 */
export function getOperands(tokens: Token[], index: number): Token[] {
  return tokens.slice(index + 1).filter((token) => {
    return isOperand(token)
  })
}

/**
 * Returns the sigil of a variable token.
 */
export function getSigil(token: Token): string {
  return token.text[0] ?? ''
}

/**
 * Describes the type and the scope of a variable from its sigil.
 */
export function describeVariable(sigil: string): string {
  if (sigil === '#') {
    return 'global integer variable'
  }

  if (sigil === '&') {
    return 'global number variable'
  }

  if (sigil === '$') {
    return 'global string variable'
  }

  if (sigil === '§') {
    return 'entity integer variable'
  }

  if (sigil === '@') {
    return 'entity number variable'
  }

  if (sigil === '£') {
    return 'entity string variable'
  }

  return 'system variable'
}
