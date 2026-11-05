// the hover texts. the command descriptions come from `docs.ts`, and every command shows the wiki
// link as well, because the catalogue is the reference for the parameters and the flags.

import { COMMAND_WIKI_URL, LANGUAGE_WIKI_URL, getCommandSummary } from './docs.ts'
import { describeVariable, findTokenAt, getSigil } from './functions.ts'
import { isBuiltInEvent, isKnownCommand, isSystemVariableName, normalizeCommand } from './metadata.ts'
import type { ParsedDocument, Token } from './types.ts'

/**
 * The hover of a token.
 */
export type HoverResult = {
  /**
   * The markdown content of the hover.
   */
  contents: string
  /**
   * The offset of the first character that the hover covers.
   */
  start: number
  /**
   * The offset after the last character that the hover covers.
   */
  end: number
}

/**
 * Builds the hover of a command.
 *
 */
function formatCommand(token: Token): string {
  const command = normalizeCommand(token.text)
  const summary = getCommandSummary(command)
  const footer = [
    'The engine lowercases the script and removes the underscores from the command name, so `set_material`, `SET_MATERIAL` and `setmaterial` are the same command.',
    '',
    `[Command catalogue](${COMMAND_WIKI_URL})`,
  ]

  if (summary !== null) {
    return [`**${command.toUpperCase()}** — command`, '', summary, '', ...footer].join('\n')
  }

  return [`**${command.toUpperCase()}** — command`, '', ...footer].join('\n')
}

/**
 * Builds the hover of an event name.
 *
 */
function formatEvent(document: ParsedDocument, token: Token): string | null {
  const event = document.events.find((candidate) => {
    return candidate.start === token.start
  })

  if (event === undefined) {
    return null
  }

  let kind = 'event'

  if (isBuiltInEvent(event.value)) {
    kind = 'built-in event'
  }

  const lines = [`**${event.name}** — ${kind}`, '']

  if (event.disabled) {
    return [
      ...lines,
      "The name starts with an underscore, so no event can trigger this block. This is the game's way of commenting out a block.",
      '',
      'The handlers are matched by name, and the custom names are part of the script to script communication.',
    ].join('\n')
  }

  return [
    ...lines,
    'The handlers are matched by name, and the custom names are part of the script to script communication.',
  ].join('\n')
}

/**
 * Builds the hover of a label.
 *
 */
function formatLabel(document: ParsedDocument, token: Token): string | null {
  const label = document.labels.find((candidate) => {
    return candidate.start === token.start && candidate.end === token.end
  })

  if (label === undefined) {
    return null
  }

  const referenceCount = document.references.filter((reference) => {
    return reference.value === label.value
  }).length
  const lines = [`**>>${label.name}** — label`, '', `Defined at line ${label.line + 1}.`]

  if (label.disabled) {
    return [
      ...lines,
      '',
      'The name starts with an underscore, so no `goto` can jump here.',
      '',
      `${referenceCount} reference(s) in this script.`,
    ].join('\n')
  }

  return [...lines, '', `${referenceCount} reference(s) in this script.`].join('\n')
}

/**
 * Builds the hover of a variable.
 *
 */
function formatVariable(document: ParsedDocument, token: Token): string {
  const variable = document.variables.find((candidate) => {
    return candidate.value === token.value && candidate.first
  })
  const lines = [
    `**${token.text}** — ${describeVariable(getSigil(token))}`,
    '',
    'The type and the scope come from the sigil, and there is no declaration: the first `set` creates the variable.',
  ]

  if (variable !== undefined) {
    return [...lines, '', `First assigned at line ${variable.line + 1}.`].join('\n')
  }

  return lines.join('\n')
}

/**
 * Builds the hover of a system variable.
 *
 */
function formatSystemVariable(token: Token): string {
  const name = token.text
  const known = isSystemVariableName(name)

  if (known) {
    return [
      `**${name}** — system variable`,
      '',
      'The engine resolves this name at runtime. System variables are read only.',
      '',
      `[Language overview](${LANGUAGE_WIKI_URL})`,
    ].join('\n')
  }

  return [
    `**${name}** — system variable`,
    '',
    'The engine does not know this name, so it resolves to `0` (or `void` for a string).',
    '',
    `[Language overview](${LANGUAGE_WIKI_URL})`,
  ].join('\n')
}

/**
 * Builds the hover of a `goto` or `gosub` target.
 *
 */
function formatReferenceTarget(document: ParsedDocument, token: Token): string | null {
  const reference = document.references.find((candidate) => {
    return candidate.start === token.start && candidate.end === token.end
  })

  if (reference === undefined) {
    return null
  }

  if (reference.dynamic) {
    return [
      `\`${reference.target}\` — dynamic label target`,
      '',
      'The name is an interpolation, so it is only known at runtime.',
    ].join('\n')
  }

  const label = document.labels.find((candidate) => {
    return candidate.value === reference.value
  })

  if (label === undefined) {
    return [
      `\`${reference.target}\` — missing label`,
      '',
      `This script has no \`>>${reference.target}\` label, so the jump fails when the execution reaches it.`,
    ].join('\n')
  }

  return [`\`${reference.target}\` — label`, '', `Defined at line ${label.line + 1}.`].join('\n')
}

/**
 * Builds the hover of a word token.
 *
 */
function formatWord(document: ParsedDocument, token: Token): string | null {
  const target = formatReferenceTarget(document, token)

  if (target !== null) {
    return target
  }

  const event = formatEvent(document, token)

  if (event !== null) {
    return event
  }

  if (!isKnownCommand(token.value)) {
    return null
  }

  return formatCommand(token)
}

/**
 * Builds the hover of a token.
 *
 */
function formatToken(document: ParsedDocument, token: Token): string | null {
  switch (token.kind) {
    case 'label': {
      return formatLabel(document, token)
    }

    case 'variable': {
      return formatVariable(document, token)
    }

    case 'systemVariable': {
      return formatSystemVariable(token)
    }

    case 'word': {
      return formatWord(document, token)
    }

    case 'comment':
    case 'flag':
    case 'interpolation':
    case 'number':
    case 'punctuation':
    case 'string': {
      return null
    }
  }
}

/**
 * Returns the hover of a position.
 *
 */
export function getHover(document: ParsedDocument, line: number, character: number): HoverResult | null {
  const documentLine = document.lines[line]

  if (documentLine === undefined) {
    return null
  }

  const token = findTokenAt(documentLine.tokens, character)

  if (token === undefined) {
    return null
  }

  const contents = formatToken(document, token)

  if (contents === null) {
    return null
  }

  return { contents, start: token.start, end: token.end }
}
