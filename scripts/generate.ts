#!/usr/bin/env node
// turns the extracted engine data (`data/al-*.txt`) into the generated typescript module and the
// textmate grammar. run it after `scripts/extract-al-metadata.ts`, and after changing the grammar
// template below.
//
// usage: node scripts/generate.ts

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * The repository root.
 */
const ROOT_DIR = path.join(import.meta.dirname, '..')

/**
 * The pattern of the characters that have a meaning in a regular expression.
 */
const REGEXP_SPECIAL_CHARACTERS = /[.*+?^${}()|[\]\\]/g

/**
 * Reads a data list and drops the empty lines.
 *
 * @throws `Error` when the file cannot be read.
 */
async function readList(fileName: string): Promise<string[]> {
  const content = await readFile(path.join(ROOT_DIR, 'data', fileName), 'utf8')

  return content
    .split('\n')
    .map((line) => {
      return line.trim()
    })
    .filter((line) => {
      return line.length > 0
    })
}

/**
 * Escapes the characters that have a meaning in a regular expression.
 */
function escapeRegExp(text: string): string {
  return text.replaceAll(REGEXP_SPECIAL_CHARACTERS, String.raw`\$&`)
}

/**
 * Turns a command name into a regular expression that accepts the underscores anywhere.
 *
 * The engine removes every underscore from the command word before the lookup, so `setmaterial`,
 * `set_material` and `s_e_t_m_a_t_e_r_i_a_l` are the same command.
 */
function toCommandPattern(command: string): string {
  return [...command]
    .map((character) => {
      return escapeRegExp(character)
    })
    .join('_?')
}

/**
 * Sorts the commands so the longer name comes first.
 *
 * The textmate engine takes the first matching alternative, so `set` would hide `setevent` without
 * this order.
 */
function sortLongestFirst(commands: string[]): string[] {
  return commands.toSorted((left, right) => {
    if (left.length !== right.length) {
      return right.length - left.length
    }

    return left.localeCompare(right)
  })
}

/**
 * Builds the textmate grammar of the language.
 */
function createGrammar(commands: string[]): Record<string, unknown> {
  const commandAlternation = sortLongestFirst(commands)
    .map((command) => {
      return toCommandPattern(command)
    })
    .join('|')

  return {
    $schema: 'https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json',
    name: 'Arx Scripting Language',
    scopeName: 'source.asl',
    fileTypes: ['asl'],
    patterns: [
      { include: '#comments' },
      { include: '#strings' },
      { include: '#interpolation' },
      { include: '#events' },
      { include: '#labels' },
      { include: '#labelReferences' },
      { include: '#flow' },
      { include: '#operators' },
      { include: '#commands' },
      { include: '#flags' },
      { include: '#variables' },
      { include: '#numbers' },
      { include: '#punctuation' },
    ],
    repository: {
      comments: {
        patterns: [
          {
            name: 'comment.line.double-slash.asl',
            match: '//.*$',
          },
        ],
      },
      strings: {
        patterns: [
          {
            name: 'string.quoted.double.asl',
            begin: '"',
            beginCaptures: {
              0: { name: 'punctuation.definition.string.begin.asl' },
            },
            end: '(")|$',
            endCaptures: {
              1: { name: 'punctuation.definition.string.end.asl' },
            },
            patterns: [
              {
                name: 'variable.other.interpolated.asl',
                match: '~[^~\\n]*~',
              },
            ],
          },
        ],
      },
      interpolation: {
        patterns: [
          {
            name: 'variable.other.interpolated.asl',
            match: '~[^~\\s]+~',
          },
        ],
      },
      events: {
        patterns: [
          {
            name: 'meta.event.disabled.asl',
            match: '(?i)^\\s*(on)\\s+(_[a-z0-9_]+)',
            captures: {
              1: { name: 'keyword.control.event.asl' },
              2: { name: 'entity.name.event.disabled.asl' },
            },
          },
          {
            name: 'meta.event.asl',
            match: '(?i)^\\s*(on)\\s+([a-z0-9_]+)',
            captures: {
              1: { name: 'keyword.control.event.asl' },
              2: { name: 'entity.name.event.asl' },
            },
          },
        ],
      },
      labels: {
        patterns: [
          {
            match: '(>>)(_?[a-z0-9_]+)',
            captures: {
              1: { name: 'punctuation.definition.label.asl' },
              2: { name: 'entity.name.function.label.asl' },
            },
          },
        ],
      },
      labelReferences: {
        patterns: [
          {
            match: '(?i)(?<![a-z0-9_])(goto|gosub)(?![a-z0-9_])\\s+(~[^~\\s]+~|[^\\s(){}]+)',
            captures: {
              1: { name: 'keyword.control.flow.asl' },
              2: { name: 'entity.name.function.label.asl' },
            },
          },
        ],
      },
      flow: {
        patterns: [
          {
            match: '(?i)(?<![a-z0-9_])(?:if|else|accept|refuse|return|random)(?![a-z0-9_])',
            name: 'keyword.control.flow.asl',
          },
        ],
      },
      operators: {
        patterns: [
          {
            match:
              '(?i)(!isgroup|(?<![a-z0-9_])(?:iselement|isin|isclass|isgroup|istype)(?![a-z0-9_])|==|!=|<=|>=|<|>)',
            name: 'keyword.operator.comparison.asl',
          },
        ],
      },
      commands: {
        patterns: [
          {
            match: `(?i)(?<![a-z0-9_])(?:${commandAlternation})(?![a-z0-9_])`,
            name: 'support.function.command.asl',
          },
          {
            // `timer<name>` is a pseudo command: the timer name is the rest of the word
            match: '(?i)(?<![a-z0-9_])timer[a-z0-9_]*(?![a-z0-9_])',
            name: 'support.function.command.timer.asl',
          },
        ],
      },
      flags: {
        patterns: [
          {
            match: '(?<=\\s)-[a-z]+(?![a-z0-9_])',
            name: 'keyword.other.flag.asl',
          },
        ],
      },
      variables: {
        patterns: [
          {
            // the system variable comes first: `^$param1` is a single token, not a `$` variable
            match: '(?i)(\\^[a-z0-9$#&_]*)|([§£@][a-z0-9_]+)|([#$&][a-z0-9_]+)',
            captures: {
              1: { name: 'variable.other.system.asl' },
              2: { name: 'variable.other.entity.asl' },
              3: { name: 'variable.other.global.asl' },
            },
          },
        ],
      },
      numbers: {
        patterns: [
          {
            match: '(?i)(?<![a-z0-9_.])-?\\d+(?:\\.\\d+)?(?![a-z0-9_.])',
            name: 'constant.numeric.asl',
          },
        ],
      },
      punctuation: {
        patterns: [
          { match: '[{}]', name: 'punctuation.section.block.asl' },
          { match: '[()]', name: 'punctuation.section.parens.asl' },
        ],
      },
    },
  }
}

/**
 * Builds the generated typescript module with the engine metadata.
 */
function createMetadataModule(commands: string[], events: string[], systemVariables: string[]): string {
  const commandLines = commands
    .map((command) => {
      return `  '${command}',`
    })
    .join('\n')
  const eventLines = events
    .map((event) => {
      return `  '${event}',`
    })
    .join('\n')
  const systemVariableLines = systemVariables
    .map((variable) => {
      if (variable.endsWith('*')) {
        return `  { name: '${variable.slice(0, -1)}', prefix: true },`
      }

      return `  { name: '${variable}', prefix: false },`
    })
    .join('\n')

  return `// generated by scripts/generate.ts from the engine sources, do not edit
import type { SystemVariable } from './types.ts'

/**
 * The top level command names of Arx Libertatis 1.2.1, without underscores and lowercase.
 */
export const COMMANDS: string[] = [
${commandLines}
]

/**
 * The built in event names of Arx Libertatis 1.2.1. The corpus uses custom names as well, so an
 * unknown name is not a mistake by itself.
 */
export const EVENTS: string[] = [
${eventLines}
]

/**
 * The system variable names of \`getSystemVar()\`, a prefix family starts with its own name.
 */
export const SYSTEM_VARIABLES: SystemVariable[] = [
${systemVariableLines}
]
`
}

const commands = await readList('al-commands.txt')
const events = await readList('al-events.txt')
const systemVariables = await readList('al-system-vars.txt')

await writeFile(
  path.join(ROOT_DIR, 'src', 'asl', 'metadata.generated.ts'),
  createMetadataModule(commands, events, systemVariables),
  'utf8',
)
await writeFile(
  path.join(ROOT_DIR, 'syntaxes', 'asl.tmLanguage.json'),
  `${JSON.stringify(createGrammar(commands), null, 2)}\n`,
  'utf8',
)

console.log(`commands: ${commands.length}`)
console.log(`events: ${events.length}`)
console.log(`system variables: ${systemVariables.length}`)
