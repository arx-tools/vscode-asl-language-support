import { COMMANDS, EVENTS, SYSTEM_VARIABLES } from './metadata.generated.ts'
import type { SystemVariable } from './types.ts'

/**
 * The pattern of the ascii uppercase letters.
 */
const ASCII_UPPERCASE = /[A-Z]/g

/**
 * The pattern of the underscores.
 */
const UNDERSCORES = /_/g

/**
 * The prefix of the pseudo command that starts a timer (`timermyname`).
 */
const TIMER_PREFIX = 'timer'

/**
 * The maximum edit distance of a command suggestion.
 */
const SUGGESTION_DISTANCE = 2

/**
 * The commands, keyed by their canonical (lowercase, underscore free) name.
 */
const COMMAND_SET = new Set(COMMANDS)

/**
 * The built in event names.
 */
const EVENT_SET = new Set(EVENTS)

/**
 * The system variable names, the prefix families included.
 */
const SYSTEM_VARIABLE_SET = new Set(
  SYSTEM_VARIABLES.filter((variable) => {
    return !variable.prefix
  }).map((variable) => {
    return variable.name
  }),
)

/**
 * The system variable families.
 */
const SYSTEM_VARIABLE_PREFIXES = SYSTEM_VARIABLES.filter((variable) => {
  return variable.prefix
}).map((variable) => {
  return variable.name
})

/**
 * Lowercases the ascii letters only, the way the engine does it with a C locale.
 */
export function toAsciiLowerCase(text: string): string {
  return text.replaceAll(ASCII_UPPERCASE, (character) => {
    return String.fromCodePoint((character.codePointAt(0) ?? 0) + 32)
  })
}

/**
 * Brings a command name into the form that the engine compares: lowercase and without underscores.
 */
export function normalizeCommand(value: string): string {
  return toAsciiLowerCase(value).replaceAll(UNDERSCORES, '')
}

/**
 * Tells whether the engine knows the command.
 *
 * The engine strips the underscores and lowercases the word, and every `timer<name>` word is a
 * valid command, because the timer commands are parsed from the word itself.
 */
export function isKnownCommand(value: string): boolean {
  const normalized = normalizeCommand(value)

  return COMMAND_SET.has(normalized) || normalized.startsWith(TIMER_PREFIX)
}

/**
 * Tells whether the command starts a timer.
 */
export function isTimerCommand(value: string): boolean {
  return normalizeCommand(value).startsWith(TIMER_PREFIX)
}

/**
 * Tells whether the event name is a built in event.
 *
 * The scripts use custom event names as well, so an unknown name is not a mistake.
 */
export function isBuiltInEvent(value: string): boolean {
  return EVENT_SET.has(toAsciiLowerCase(value))
}

/**
 * Tells whether the name is a system variable of the engine.
 */
export function isSystemVariableName(name: string): boolean {
  if (SYSTEM_VARIABLE_SET.has(name)) {
    return true
  }

  return SYSTEM_VARIABLE_PREFIXES.some((prefix) => {
    return name.startsWith(prefix)
  })
}

/**
 * Returns the system variables, the prefix families included.
 */
export function getSystemVariables(): SystemVariable[] {
  return SYSTEM_VARIABLES
}

/**
 * Returns the edit distance of two texts.
 */
function getEditDistance(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => {
    return index
  })

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = [leftIndex]

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      let substitutionCost = 1

      if (left[leftIndex - 1] === right[rightIndex - 1]) {
        substitutionCost = 0
      }

      const deletion = (previous[rightIndex] ?? 0) + 1
      const insertion = (current[rightIndex - 1] ?? 0) + 1
      const substitution = (previous[rightIndex - 1] ?? 0) + substitutionCost

      current[rightIndex] = Math.min(deletion, insertion, substitution)
    }

    previous = current
  }

  return previous[right.length] ?? 0
}

/**
 * Finds the closest known command within the suggestion distance.
 */
export function suggestCommand(value: string): string | null {
  const normalized = normalizeCommand(value)
  let best: string | null = null
  let bestDistance = SUGGESTION_DISTANCE + 1

  for (const command of COMMANDS) {
    if (Math.abs(command.length - normalized.length) > SUGGESTION_DISTANCE) {
      continue
    }

    const distance = getEditDistance(normalized, command)

    if (distance < bestDistance) {
      best = command
      bestDistance = distance
    }
  }

  if (bestDistance > SUGGESTION_DISTANCE) {
    return null
  }

  return best
}

export { COMMANDS, EVENTS, SYSTEM_VARIABLES } from './metadata.generated.ts'
