// the go to definition targets of the language: a `goto`/`gosub` jumps to its label, and a variable
// jumps to its first assignment.

import { findTokenAt } from './functions.ts'
import type { ParsedDocument } from './types.ts'

/**
 * The target of a definition lookup.
 */
export type DefinitionTarget = {
  /**
   * The zero based line of the definition.
   */
  line: number
  /**
   * The offset of the first character inside the line.
   */
  start: number
  /**
   * The offset after the last character.
   */
  end: number
}

/**
 * Returns the definition of a position.
 */
export function getDefinition(document: ParsedDocument, line: number, character: number): DefinitionTarget | null {
  const documentLine = document.lines[line]

  if (documentLine === undefined) {
    return null
  }

  const token = findTokenAt(documentLine.tokens, character)

  if (token === undefined) {
    return null
  }

  const reference = document.references.find((candidate) => {
    return candidate.start === token.start && candidate.end === token.end
  })

  if (reference !== undefined && !reference.dynamic) {
    const label = document.labels.find((candidate) => {
      return candidate.value === reference.value
    })

    if (label !== undefined) {
      return { line: label.line, start: label.start, end: label.end }
    }

    return null
  }

  if (token.kind === 'variable') {
    const variable = document.variables.find((candidate) => {
      return candidate.value === token.value && candidate.first
    })

    if (variable !== undefined) {
      return { line: variable.line, start: variable.start, end: variable.end }
    }
  }

  return null
}
