#!/usr/bin/env node
// extracts the Arx Libertatis 1.2.1 command names, event names and system variables from the engine
// sources. the result is written into `data/`, and `scripts/generate.ts` turns that into the
// generated metadata module and the textmate grammar. the data files are committed, so a normal
// build does not need an Arx Libertatis checkout.
//
// usage: node scripts/extract-al-metadata.ts [path/to/ArxLibertatis/src/script]

import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import * as process from 'node:process'

/**
 * The folder of the Arx Libertatis script sources, relative to this repository.
 */
const DEFAULT_SOURCE_DIR = path.join(import.meta.dirname, '..', '..', 'ArxLibertatis', 'src', 'script')

/**
 * The folder of the extracted data files.
 */
const DATA_DIR = path.join(import.meta.dirname, '..', 'data')

/**
 * The pattern of a top level command registration.
 *
 * The registered class is either used as is (`new SetScaleCommand`), constructed with the command
 * name (`new IncrementCommand("++", 1)`), or it comes from a namespace (`new script::ObsoleteCommand("gmode")`).
 */
const REGISTER_COMMAND_PATTERN = /registerCommand\(new\s+((?:\w+::)*\w+)\s*(\(([^)]*)\))?\)/g

/**
 * The pattern of a command name literal inside a class body.
 *
 * The name is usually passed to `Command("...")`, but a command can delegate it to a base class as
 * well (`AbstractDamageCommand("dodamage")`), which is why any `*Command("...")` call is collected.
 */
const COMMAND_LITERAL_PATTERN = /\b\w*Command\("([^"]+)"/g

/**
 * The pattern of an event name literal.
 */
const EVENT_PATTERN = /SCRIPT_EVENT\("on\s+([a-z0-9_]+)"\)/g

/**
 * The pattern of a system variable compared by equality.
 */
const SYSTEM_VARIABLE_PATTERN = /name\s*==\s*"(\^[^"]+)"/g

/**
 * The pattern of a system variable family compared by prefix.
 */
const SYSTEM_VARIABLE_PREFIX_PATTERN = /starts_with\(name,\s*"(\^[^"]+)"\)/g

/**
 * Reads every C++ source of the script module.
 */
async function readSources(sourceDir: string): Promise<Map<string, string>> {
  const entries = await readdir(sourceDir)
  const sources = new Map<string, string>()

  for (const entry of entries) {
    if (!entry.endsWith('.cpp')) {
      continue
    }

    sources.set(entry, await readFile(path.join(sourceDir, entry), 'utf8'))
  }

  return sources
}

/**
 * Returns the body of a class declaration, including the braces.
 */
function findClassBody(source: string, className: string): string | null {
  const pattern = new RegExp(String.raw`\bclass\s+${className}\b`, 'g')
  let match = pattern.exec(source)
  let lastIndex = -1

  while (match) {
    lastIndex = match.index
    match = pattern.exec(source)
  }

  if (lastIndex === -1) {
    return null
  }

  const openBrace = source.indexOf('{', lastIndex)

  if (openBrace === -1) {
    return null
  }

  let depth = 0

  for (let index = openBrace; index < source.length; index++) {
    if (source[index] === '{') {
      depth++
    } else if (source[index] === '}') {
      depth--

      if (depth === 0) {
        return source.slice(openBrace, index + 1)
      }
    }
  }

  return null
}

/**
 * Resolves the command name of a registered command class.
 */
function findCommandName(source: string, className: string): string | null {
  const body = findClassBody(source, className)

  if (body === null) {
    return null
  }

  const literals: string[] = []
  let match = COMMAND_LITERAL_PATTERN.exec(body)

  while (match) {
    literals.push(match[1].trim())
    match = COMMAND_LITERAL_PATTERN.exec(body)
  }

  if (literals.length === 0) {
    return null
  }

  const derivedName = className.replace(/Command$/, '').toLowerCase()
  const named = literals.find((literal) => {
    return literal === derivedName
  })

  return named ?? literals.at(-1) ?? null
}

/**
 * Collects the top level command names of the engine.
 *
 * @throws `Error` when a registered command class does not pass a literal name.
 */
function extractCommands(sources: Map<string, string>): string[] {
  const commands = new Set<string>()

  for (const source of sources.values()) {
    let match = REGISTER_COMMAND_PATTERN.exec(source)

    while (match) {
      const separatorIndex = match[1].lastIndexOf('::')
      let className = match[1]

      if (separatorIndex !== -1) {
        className = match[1].slice(separatorIndex + 2)
      }

      const constructorArguments = match[3]
      let literal: RegExpExecArray | null = null

      if (constructorArguments !== undefined) {
        literal = /^\s*"([^"]+)"/.exec(constructorArguments)
      }

      if (literal) {
        commands.add(literal[1].trim())
      } else {
        const name = findCommandName(source, className)

        if (name === null) {
          throw new Error(`unknown command class: ${className}`)
        }

        commands.add(name)
      }

      match = REGISTER_COMMAND_PATTERN.exec(source)
    }
  }

  return [...commands].toSorted()
}

/**
 * Collects the built in event names of the engine.
 *
 * @throws `Error` when `ScriptEvent.cpp` is missing from the sources.
 */
function extractEvents(sources: Map<string, string>): string[] {
  const events = new Set<string>()
  const source = sources.get('ScriptEvent.cpp')

  if (source === undefined) {
    throw new Error('ScriptEvent.cpp is missing from the script sources')
  }

  let match = EVENT_PATTERN.exec(source)

  while (match) {
    events.add(match[1])
    match = EVENT_PATTERN.exec(source)
  }

  return [...events].toSorted()
}

/**
 * Collects the system variable names of `getSystemVar()`.
 *
 * A family is written with a trailing `*` (`^dist_*`), an exact name without it (`^life`).
 *
 * @throws `Error` when `Script.cpp` or `getSystemVar()` is missing from the sources.
 */
function extractSystemVariables(sources: Map<string, string>): string[] {
  const source = sources.get('Script.cpp')

  if (source === undefined) {
    throw new Error('Script.cpp is missing from the script sources')
  }

  const start = source.indexOf('ValueType getSystemVar(')

  if (start === -1) {
    throw new Error('getSystemVar() is missing from Script.cpp')
  }

  const body = source.slice(start)
  const variables = new Set<string>()

  for (const match of body.matchAll(SYSTEM_VARIABLE_PATTERN)) {
    variables.add(match[1])
  }

  for (const match of body.matchAll(SYSTEM_VARIABLE_PREFIX_PATTERN)) {
    variables.add(`${match[1]}*`)
  }

  return [...variables].toSorted()
}

/**
 * Writes a list file with one entry per line and a trailing newline.
 */
async function writeList(fileName: string, entries: string[]): Promise<void> {
  await writeFile(path.join(DATA_DIR, fileName), `${entries.join('\n')}\n`, 'utf8')
}

const sourceDir = process.argv[2] ?? DEFAULT_SOURCE_DIR
const sources = await readSources(sourceDir)
const commands = extractCommands(sources)
const events = extractEvents(sources)
const systemVariables = extractSystemVariables(sources)

await writeList('al-commands.txt', commands)
await writeList('al-events.txt', events)
await writeList('al-system-vars.txt', systemVariables)

console.log(`commands: ${commands.length}`)
console.log(`events: ${events.length}`)
console.log(`system variables: ${systemVariables.length}`)
