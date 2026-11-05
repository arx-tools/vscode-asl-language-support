// the parser is deliberately line oriented: the engine reads the arguments up to the end of the line
// (`skipWhitespace(false, true)` returns at the newline), so a command never continues on the next
// line. the parser does not build a syntax tree, it collects the facts that the language features
// need (the events, the labels, the references, the braces and the statements).

import { getCodeTokens } from './functions.ts'
import { isOperand, tokenizeLine } from './lexer.ts'
import { normalizeCommand } from './metadata.ts'
import type {
  BraceToken,
  DocumentLine,
  EventBlock,
  LabelToken,
  ParsedDocument,
  Problem,
  ReferenceToken,
  Statement,
  VariableUse,
} from './types.ts'

/**
 * The value of the `on` keyword.
 */
const EVENT_KEYWORD = 'on'

/**
 * The commands that jump to a label.
 */
const REFERENCE_COMMANDS = new Set(['goto', 'gosub'])

/**
 * The command that assigns a variable.
 */
const SET_COMMAND = 'set'

/**
 * The braces of the document and the brace depth at the start of every line.
 */
type BraceCollection = {
  /**
   * The braces in the order of the document.
   */
  braces: BraceToken[]
  /**
   * The number of the open braces at the start of every line.
   */
  depthByLine: number[]
}

/**
 * Creates a problem.
 */
function createProblem(problem: Omit<Problem, 'line'>, line: number): Problem {
  return { ...problem, line }
}

/**
 * Splits the text into lines and drops the carriage return of a CRLF document.
 */
function splitLines(text: string): string[] {
  return text.split('\n').map((line) => {
    if (line.endsWith('\r')) {
      return line.slice(0, -1)
    }

    return line
  })
}

/**
 * Tokenizes every line of the document.
 */
function tokenizeDocument(lines: string[]): DocumentLine[] {
  const tokenized: DocumentLine[] = []

  for (const [index, text] of lines.entries()) {
    const { tokens, problems } = tokenizeLine(text, index)

    tokenized.push({ index, text, tokens, problems })
  }

  return tokenized
}

/**
 * Collects the braces and pairs the matching ones.
 */
function collectBraces(lines: DocumentLine[], problems: Problem[]): BraceCollection {
  const braces: BraceToken[] = []
  const depthByLine: number[] = []
  const openBraces: number[] = []

  for (const line of lines) {
    depthByLine.push(openBraces.length)

    for (const token of line.tokens) {
      if (token.kind !== 'punctuation') {
        continue
      }

      if (token.text === '{') {
        braces.push({ line: line.index, start: token.start, end: token.end, open: true, match: -1 })
        openBraces.push(braces.length - 1)
      } else if (token.text === '}') {
        const openIndex = openBraces.pop()

        braces.push({ line: line.index, start: token.start, end: token.end, open: false, match: -1 })

        if (openIndex === undefined) {
          problems.push(
            createProblem(
              {
                code: 'stray-brace',
                category: 'structure',
                severity: 'error',
                message: 'This closing brace has no opening brace.',
                start: token.start,
                end: token.end,
              },
              line.index,
            ),
          )
          continue
        }

        const closeBrace = braces.at(-1)

        if (closeBrace !== undefined) {
          closeBrace.match = openIndex
          braces[openIndex].match = braces.length - 1
        }
      }
    }
  }

  for (const openIndex of openBraces) {
    const brace = braces[openIndex]

    problems.push(
      createProblem(
        {
          code: 'unclosed-brace',
          category: 'structure',
          severity: 'error',
          message: 'This block is not closed before the end of the script.',
          start: brace.start,
          end: brace.end,
        },
        brace.line,
      ),
    )
  }

  return { braces, depthByLine }
}

/**
 * Collects the `>>label` tokens of the document.
 */
function collectLabels(lines: DocumentLine[]): LabelToken[] {
  const labels: LabelToken[] = []

  for (const line of lines) {
    for (const token of line.tokens) {
      if (token.kind !== 'label') {
        continue
      }

      labels.push({
        name: token.text,
        value: token.value,
        line: line.index,
        start: token.start,
        end: token.end,
        disabled: token.text.startsWith('_'),
      })
    }
  }

  return labels
}

/**
 * Collects the first command of every line.
 *
 * An `on <event>` line is skipped: the `on` keyword is not a command, and the commands of a one line
 * event block are not checked. A line that starts with a label still yields its command.
 */
function collectStatements(lines: DocumentLine[]): Statement[] {
  const statements: Statement[] = []

  for (const line of lines) {
    const tokens = getCodeTokens(line)
    const command = tokens.find((token) => {
      return token.kind === 'word'
    })

    if (command === undefined) {
      continue
    }

    if (command.value === EVENT_KEYWORD) {
      continue
    }

    statements.push({
      name: command.text,
      value: normalizeCommand(command.text),
      line: line.index,
      start: command.start,
      end: command.end,
      tokens,
    })
  }

  return statements
}

/**
 * Finds the opening brace of an event block.
 *
 * The engine skips the newlines before the `{`, so the brace can stand on the next line; anything
 * else before the brace means that the block never runs.
 */
function findOpeningBrace(lines: DocumentLine[], lineIndex: number, tokenIndex: number): number | null {
  const eventLine = lines[lineIndex]

  if (eventLine === undefined) {
    return null
  }

  for (const token of getCodeTokens(eventLine).slice(tokenIndex + 1)) {
    if (token.kind === 'punctuation' && token.text === '{') {
      return lineIndex
    }
  }

  for (const line of lines.slice(lineIndex + 1)) {
    const nextToken = getCodeTokens(line)[0]

    if (nextToken === undefined) {
      continue
    }

    if (nextToken.kind === 'punctuation' && nextToken.text === '{') {
      return line.index
    }

    return null
  }

  return null
}

/**
 * Collects the `on <event>` blocks of the document.
 */
function collectEvents(lines: DocumentLine[], depthByLine: number[], problems: Problem[]): EventBlock[] {
  const events: EventBlock[] = []

  for (const line of lines) {
    const tokens = getCodeTokens(line)
    const keyword = tokens[0]

    if (keyword?.kind !== 'word' || keyword.value !== EVENT_KEYWORD) {
      continue
    }

    const nameToken = tokens.slice(1).find((token) => {
      return token.kind === 'word'
    })

    if (nameToken === undefined) {
      continue
    }

    const openBraceLine = findOpeningBrace(lines, line.index, tokens.indexOf(nameToken))

    if (openBraceLine === null) {
      problems.push(
        createProblem(
          {
            code: 'missing-event-brace',
            category: 'structure',
            severity: 'error',
            message: 'The engine needs a `{` after the event name, otherwise the whole block is skipped.',
            start: nameToken.start,
            end: nameToken.end,
          },
          line.index,
        ),
      )
    }

    events.push({
      name: nameToken.text,
      value: nameToken.value,
      line: line.index,
      start: nameToken.start,
      end: nameToken.end,
      openBraceLine,
      closeLine: null,
      depth: depthByLine[line.index] ?? 0,
      disabled: nameToken.text.startsWith('_'),
    })
  }

  return events
}

/**
 * Fills the closing line of the event blocks from the paired braces.
 */
function resolveCloseLines(events: EventBlock[], braces: BraceToken[]): void {
  for (const event of events) {
    if (event.openBraceLine === null) {
      continue
    }

    const openBrace = braces.find((brace) => {
      return brace.open && brace.line === event.openBraceLine
    })

    if (openBrace === undefined || openBrace.match === -1) {
      continue
    }

    event.closeLine = braces[openBrace.match]?.line ?? null
  }
}

/**
 * Collects the `goto` and `gosub` commands of the document.
 */
function collectReferences(lines: DocumentLine[]): ReferenceToken[] {
  const references: ReferenceToken[] = []

  for (const line of lines) {
    const tokens = getCodeTokens(line)

    for (const [index, token] of tokens.entries()) {
      if (token.kind !== 'word' || !REFERENCE_COMMANDS.has(token.value)) {
        continue
      }

      const target = tokens.slice(index + 1).find((candidate) => {
        return isOperand(candidate)
      })

      if (target === undefined) {
        continue
      }

      let kind: ReferenceToken['kind'] = 'gosub'

      if (token.value === 'goto') {
        kind = 'goto'
      }

      references.push({
        kind,
        target: target.text,
        value: target.value,
        line: line.index,
        start: target.start,
        end: target.end,
        dynamic: target.kind === 'interpolation' || target.text.startsWith('~'),
      })
    }
  }

  return references
}

/**
 * Collects the variables that the document assigns with `set`.
 */
function collectVariables(lines: DocumentLine[]): VariableUse[] {
  const variables: VariableUse[] = []
  const seen = new Set<string>()

  for (const line of lines) {
    const tokens = getCodeTokens(line)

    for (const [index, token] of tokens.entries()) {
      if (token.kind !== 'word' || token.value !== SET_COMMAND) {
        continue
      }

      const target = tokens.slice(index + 1).find((candidate) => {
        return isOperand(candidate)
      })

      if (target?.kind !== 'variable') {
        continue
      }

      const first = !seen.has(target.value)

      seen.add(target.value)
      variables.push({
        name: target.text,
        value: target.value,
        line: line.index,
        start: target.start,
        end: target.end,
        first,
      })
    }
  }

  return variables
}

/**
 * Parses the document.
 */
export function parseDocument(text: string): ParsedDocument {
  const lines = tokenizeDocument(splitLines(text))
  const problems = lines.flatMap((line) => {
    return line.problems
  })
  const { braces, depthByLine } = collectBraces(lines, problems)
  const events = collectEvents(lines, depthByLine, problems)

  resolveCloseLines(events, braces)

  return {
    lines,
    events,
    labels: collectLabels(lines),
    references: collectReferences(lines),
    statements: collectStatements(lines),
    braces,
    variables: collectVariables(lines),
    problems,
  }
}
