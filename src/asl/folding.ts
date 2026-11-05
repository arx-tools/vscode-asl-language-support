// the folding ranges of a script: every balanced brace pair, and the whole event block from the `on`
// line, so the handler can be folded without the opening brace line.

import type { ParsedDocument } from './types.ts'

/**
 * A folding range.
 */
export type FoldRange = {
  /**
   * The zero based first line of the range.
   */
  startLine: number
  /**
   * The zero based last line of the range.
   */
  endLine: number
  /**
   * The kind of the range.
   */
  kind: 'block' | 'event'
}

/**
 * Returns the folding ranges of the document.
 */
export function getFoldingRanges(document: ParsedDocument): FoldRange[] {
  const ranges: FoldRange[] = []
  const seen = new Set<string>()

  // the events come first, so a block that starts on the `on` line keeps the event kind
  for (const event of document.events) {
    if (event.closeLine === null || event.closeLine <= event.line) {
      continue
    }

    ranges.push({ startLine: event.line, endLine: event.closeLine, kind: 'event' })
    seen.add(`${event.line}:${event.closeLine}`)
  }

  for (const brace of document.braces) {
    if (!brace.open || brace.match === -1) {
      continue
    }

    const closeBrace = document.braces[brace.match]
    const endLine = closeBrace?.line ?? brace.line
    const key = `${brace.line}:${endLine}`

    if (endLine <= brace.line || seen.has(key)) {
      continue
    }

    ranges.push({ startLine: brace.line, endLine, kind: 'block' })
    seen.add(key)
  }

  return ranges.toSorted((left, right) => {
    return left.startLine - right.startLine
  })
}
