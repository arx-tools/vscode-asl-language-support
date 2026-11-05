// the completions are context aware: the first word of a line is a command, the argument of `on` is
// an event, the argument of `goto` is a label of the document, and the argument of `inventory` is one
// of its subcommands. the lists come from the extracted engine metadata.

import { getSubcommands } from './docs.ts'
import { countCharacter, findTokenAt } from './functions.ts'
import { COMMANDS, EVENTS, SYSTEM_VARIABLES, normalizeCommand } from './metadata.ts'
import type { ParsedDocument } from './types.ts'

/**
 * The kind of a completion, which decides the icon of the list entry.
 */
export type CompletionKind = 'command' | 'event' | 'label' | 'subcommand' | 'systemVariable' | 'variable'

/**
 * A completion entry.
 */
export type CompletionEntry = {
  /**
   * The text that is shown in the list.
   */
  label: string
  /**
   * The text that is inserted.
   */
  insertText: string
  /**
   * The kind of the entry.
   */
  kind: CompletionKind
  /**
   * The short description that is shown next to the label.
   */
  detail: string
}

/**
 * The commands that take a worded subcommand.
 */
const SUBCOMMAND_COMMANDS = new Set(['inventory', 'behavior', 'tweak', 'spawn'])

/**
 * The commands that jump to a label.
 */
const REFERENCE_COMMANDS = new Set(['goto', 'gosub'])

/**
 * The commands that expect a variable target.
 */
const VARIABLE_COMMANDS = new Set(['set', 'unset', 'inc', 'dec'])

/**
 * The characters that end a word, the same set that the tokenizer uses.
 */
const WORD_BOUNDARIES = new Set([' ', '\t', '(', ')', '{', '}'])

/**
 * Returns the word that is being typed at the end of a text.
 */
function getWordPrefix(text: string): string {
  let index = text.length

  while (index > 0 && !WORD_BOUNDARIES.has(text[index - 1] ?? '')) {
    index = index - 1
  }

  return text.slice(index)
}

/**
 * Returns the last word of a text.
 */
function getLastWord(text: string): string {
  return getWordPrefix(text.trimEnd())
}

/**
 * Tells whether the text is the start of a statement, where a command can stand.
 */
function isStatementStart(text: string): boolean {
  const trimmed = text.trim()

  if (trimmed === '') {
    return true
  }

  // a line can start with a label, the command follows it
  return trimmed.startsWith('>>') && !trimmed.includes(' ')
}

/**
 * Returns the system variable completions.
 */
function getSystemVariableCompletions(text: string): CompletionEntry[] {
  const normalizedPrefix = text.slice(text.lastIndexOf('~') + 1).toLowerCase()

  return SYSTEM_VARIABLES.filter((variable) => {
    return variable.name.toLowerCase().startsWith(normalizedPrefix)
  }).map((variable) => {
    let detail = 'system variable'

    if (variable.prefix) {
      detail = 'system variable family'
    }

    return {
      label: variable.name,
      insertText: variable.name,
      kind: 'systemVariable',
      detail,
    }
  })
}

/**
 * Returns the completions of the variables of the document.
 */
function getVariableCompletions(document: ParsedDocument, prefix: string): CompletionEntry[] {
  const normalizedPrefix = prefix.toLowerCase()
  const entries: CompletionEntry[] = []
  const seen = new Set<string>()

  for (const variable of document.variables) {
    if (!variable.value.startsWith(normalizedPrefix) || seen.has(variable.value)) {
      continue
    }

    seen.add(variable.value)
    entries.push({
      label: variable.name,
      insertText: variable.name,
      kind: 'variable',
      detail: `variable (line ${variable.line + 1})`,
    })
  }

  return entries
}

/**
 * Returns the label completions of the document.
 */
function getLabelCompletions(document: ParsedDocument, prefix: string): CompletionEntry[] {
  const normalizedPrefix = prefix.toLowerCase()
  const entries: CompletionEntry[] = []
  const seen = new Set<string>()

  for (const label of document.labels) {
    if (!label.value.startsWith(normalizedPrefix) || seen.has(label.value)) {
      continue
    }

    seen.add(label.value)
    entries.push({
      label: label.name,
      insertText: label.name,
      kind: 'label',
      detail: `label (line ${label.line + 1})`,
    })
  }

  return entries
}

/**
 * Returns the event completions.
 */
function getEventCompletions(prefix: string): CompletionEntry[] {
  const normalizedPrefix = prefix.toLowerCase()

  return EVENTS.filter((event) => {
    return event !== 'null' && event.startsWith(normalizedPrefix)
  }).map((event) => {
    return {
      label: event.toUpperCase(),
      insertText: event.toUpperCase(),
      kind: 'event',
      detail: 'event',
    }
  })
}

/**
 * Returns the command completions.
 */
function getCommandCompletions(prefix: string): CompletionEntry[] {
  const normalizedPrefix = normalizeCommand(prefix)

  return COMMANDS.filter((command) => {
    return command.startsWith(normalizedPrefix)
  }).map((command) => {
    return {
      label: command.toUpperCase(),
      insertText: command.toUpperCase(),
      kind: 'command',
      detail: 'command',
    }
  })
}

/**
 * Returns the subcommand completions of a command.
 */
function getSubcommandCompletions(command: string, prefix: string): CompletionEntry[] {
  const normalizedPrefix = prefix.toLowerCase()

  return getSubcommands(command)
    .filter((subcommand) => {
      return subcommand.startsWith(normalizedPrefix)
    })
    .map((subcommand) => {
      return {
        label: subcommand.toUpperCase(),
        insertText: subcommand.toUpperCase(),
        kind: 'subcommand',
        detail: `${command} subcommand`,
      }
    })
}

/**
 * Returns the completions for a position of the document.
 */
export function getCompletions(document: ParsedDocument, line: number, character: number): CompletionEntry[] {
  const documentLine = document.lines[line]

  if (documentLine === undefined) {
    return []
  }

  const comment = documentLine.tokens.find((token) => {
    return token.kind === 'comment'
  })

  if (comment !== undefined && comment.start <= character) {
    return []
  }

  const { text } = documentLine
  const before = text.slice(0, character)
  const enclosing = findTokenAt(documentLine.tokens, character)

  if (enclosing?.kind === 'string') {
    const insideInterpolation = countCharacter(text.slice(enclosing.start, character), '~') % 2 === 1

    if (!insideInterpolation) {
      return []
    }

    return getSystemVariableCompletions(before.slice(enclosing.start))
  }

  if (enclosing?.kind === 'interpolation') {
    return getSystemVariableCompletions(before.slice(enclosing.start))
  }

  const prefix = getWordPrefix(before)
  const rest = before.slice(0, before.length - prefix.length)
  const previousWord = getLastWord(rest).toLowerCase()
  const normalizedPrefix = prefix.toLowerCase()

  if (normalizedPrefix.startsWith('^')) {
    return getSystemVariableCompletions(prefix)
  }

  if (previousWord === 'on') {
    return getEventCompletions(prefix)
  }

  if (REFERENCE_COMMANDS.has(previousWord)) {
    return getLabelCompletions(document, prefix)
  }

  if (VARIABLE_COMMANDS.has(previousWord)) {
    return getVariableCompletions(document, prefix)
  }

  if (SUBCOMMAND_COMMANDS.has(previousWord)) {
    return getSubcommandCompletions(previousWord, prefix)
  }

  if (isStatementStart(rest)) {
    return getCommandCompletions(prefix)
  }

  return []
}
