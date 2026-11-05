// the outline of a script: the event handlers with the labels that they contain.

import { isBuiltInEvent } from './metadata.ts'
import type { EventBlock, ParsedDocument } from './types.ts'

/**
 * The kind of an outline entry.
 */
export type DocumentSymbolKind = 'event' | 'label'

/**
 * An entry of the outline.
 */
export type DocumentSymbolEntry = {
  /**
   * The name of the entry.
   */
  name: string
  /**
   * The kind of the entry.
   */
  kind: DocumentSymbolKind
  /**
   * The short description that is shown next to the name.
   */
  detail: string
  /**
   * The zero based line of the entry.
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
  /**
   * The nested entries.
   */
  children: DocumentSymbolEntry[]
}

/**
 * Returns the innermost event block that contains a line.
 */
function findEnclosingEvent(events: EventBlock[], line: number): EventBlock | undefined {
  let enclosing: EventBlock | undefined

  for (const event of events) {
    const endsAfter = event.closeLine === null || event.closeLine >= line

    if (!endsAfter || event.line > line) {
      continue
    }

    if (enclosing === undefined || event.line > enclosing.line) {
      enclosing = event
    }
  }

  return enclosing
}

/**
 * Returns the outline of the document.
 */
export function getDocumentSymbols(document: ParsedDocument): DocumentSymbolEntry[] {
  const entries: DocumentSymbolEntry[] = document.events.map((event) => {
    let detail = 'event'

    if (isBuiltInEvent(event.value)) {
      detail = 'built-in event'
    }

    if (event.disabled) {
      detail = 'disabled event'
    }

    return {
      name: event.name,
      kind: 'event',
      detail,
      line: event.line,
      start: event.start,
      end: event.end,
      children: [],
    }
  })

  for (const label of document.labels) {
    const enclosing = findEnclosingEvent(document.events, label.line)
    let detail = 'label'

    if (label.disabled) {
      detail = 'disabled label'
    }

    const entry: DocumentSymbolEntry = {
      name: label.name,
      kind: 'label',
      detail,
      line: label.line,
      start: label.start,
      end: label.end,
      children: [],
    }

    if (enclosing === undefined) {
      entries.push(entry)
      continue
    }

    const parent = entries.find((candidate) => {
      return candidate.kind === 'event' && candidate.line === enclosing.line
    })

    if (parent === undefined) {
      entries.push(entry)
      continue
    }

    parent.children.push(entry)
  }

  const sorted = entries.toSorted((left, right) => {
    return left.line - right.line
  })

  for (const entry of sorted) {
    entry.children = entry.children.toSorted((left, right) => {
      return left.line - right.line
    })
  }

  return sorted
}
