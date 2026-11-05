// the checks run on the parsed document and mirror the engine's own warnings where it makes sense.
// the engine only reports a problem when the execution reaches the broken line, so a static check is
// strictly better — as long as it does not report the constructs that the original scripts use on
// purpose (a custom event name, a `timer<name>` command, or a `_` disabled block).

import { getCodeTokens, getOperands } from './functions.ts'
import { isOperand } from './lexer.ts'
import { isKnownCommand, suggestCommand } from './metadata.ts'
import type { ParsedDocument, Problem, Token } from './types.ts'

/**
 * The switches of the analysis, mirroring the settings of the extension.
 */
export type AnalysisOptions = {
  /**
   * Whether the command checks run.
   */
  commands: boolean
  /**
   * Whether the structural checks run.
   */
  structure: boolean
  /**
   * Whether the label and event reference checks run.
   */
  references: boolean
  /**
   * Whether the string checks run.
   */
  strings: boolean
  /**
   * Whether an event block without a terminator is reported.
   */
  missingTerminator: boolean
}

/**
 * The default switches, which are the defaults of the settings as well.
 */
export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  commands: true,
  structure: true,
  references: true,
  strings: true,
  missingTerminator: false,
}

/**
 * The operators of the `if` command.
 */
const COMPARISON_OPERATORS = new Set([
  '==',
  '!=',
  '<=',
  '<',
  '>=',
  '>',
  'iselement',
  'isin',
  'isclass',
  'isgroup',
  '!isgroup',
  'istype',
])

/**
 * The commands that end an event block properly.
 */
const TERMINATORS = new Set(['accept', 'refuse', 'return'])

/**
 * The word of the `set` command.
 */
const SET_COMMAND = 'set'

/**
 * The word of the `if` command.
 */
const IF_COMMAND = 'if'

/**
 * The minimum number of the operands of an `if`: the left side, the operator and the right side.
 */
const IF_OPERAND_COUNT = 3

/**
 * Returns the code tokens of a line.
 */
function getLineTokens(document: ParsedDocument, line: number): Token[] {
  const documentLine = document.lines[line]

  if (documentLine === undefined) {
    return []
  }

  return getCodeTokens(documentLine)
}

/**
 * Checks the statements for unknown commands.
 */
function checkCommands(document: ParsedDocument): Problem[] {
  const problems: Problem[] = []

  for (const statement of document.statements) {
    if (isKnownCommand(statement.value)) {
      continue
    }

    const suggestion = suggestCommand(statement.value)
    let message = `Unknown command \`${statement.name}\`.`

    if (suggestion !== null) {
      message = `Unknown command \`${statement.name}\`. Did you mean \`${suggestion}\`?`
    }

    problems.push({
      code: 'unknown-command',
      category: 'commands',
      severity: 'warning',
      message,
      line: statement.line,
      start: statement.start,
      end: statement.end,
    })
  }

  return problems
}

/**
 * Checks the `set` commands for a variable target.
 */
function checkSetTargets(document: ParsedDocument): Problem[] {
  const problems: Problem[] = []

  for (let line = 0; line < document.lines.length; line++) {
    const tokens = getLineTokens(document, line)

    for (const [index, token] of tokens.entries()) {
      if (token.kind !== 'word' || token.value !== SET_COMMAND) {
        continue
      }

      const target = tokens.slice(index + 1).find((candidate) => {
        return isOperand(candidate)
      })

      if (target === undefined) {
        continue
      }

      if (target.kind === 'variable' || target.kind === 'systemVariable') {
        continue
      }

      problems.push({
        code: 'set-without-variable',
        category: 'commands',
        severity: 'warning',
        message: `The \`set\` command needs a variable target (\`#\`, \`&\`, \`$\`, \`§\`, \`@\` or \`£\`), not \`${target.text}\`.`,
        line,
        start: target.start,
        end: target.end,
      })
    }
  }

  return problems
}

/**
 * Checks the `if` commands for their three operands and the operator.
 *
 * The engine treats the parentheses as separators, so a glued operator (`x==1`) becomes a single
 * operand, and the whole comparison silently turns into a constant truth.
 */
function checkConditions(document: ParsedDocument): Problem[] {
  const problems: Problem[] = []

  for (let line = 0; line < document.lines.length; line++) {
    const tokens = getLineTokens(document, line)

    for (const [index, token] of tokens.entries()) {
      if (token.kind !== 'word' || token.value !== IF_COMMAND) {
        continue
      }

      const operands = getOperands(tokens, index)

      if (operands.length < IF_OPERAND_COUNT) {
        const last = operands.at(-1) ?? token

        problems.push({
          code: 'if-needs-operands',
          category: 'structure',
          severity: 'warning',
          message: 'The `if` command needs three words: the left side, the operator and the right side.',
          line,
          start: last.start,
          end: last.end,
        })
        continue
      }

      const operator = operands[1]

      if (operator === undefined || COMPARISON_OPERATORS.has(operator.value)) {
        continue
      }

      problems.push({
        code: 'if-unknown-operator',
        category: 'structure',
        severity: 'warning',
        message: `Unknown operator \`${operator.text}\`. The operator and the operand are probably glued together, and the engine treats the condition as always true.`,
        line,
        start: operator.start,
        end: operator.end,
      })
    }
  }

  return problems
}

/**
 * Checks the event blocks for the missing brace and the duplicates.
 */
function checkEvents(document: ParsedDocument): Problem[] {
  const problems: Problem[] = []
  const seen = new Set<string>()

  for (const event of document.events) {
    if (seen.has(event.value)) {
      problems.push({
        code: 'duplicate-event',
        category: 'references',
        severity: 'warning',
        message: `The engine only uses the first \`on ${event.name}\` block of a script.`,
        line: event.line,
        start: event.start,
        end: event.end,
      })
      continue
    }

    seen.add(event.value)
  }

  return problems
}

/**
 * Checks the labels and the references.
 */
function checkReferences(document: ParsedDocument): Problem[] {
  const problems: Problem[] = []
  const seenLabels = new Set<string>()

  for (const label of document.labels) {
    if (seenLabels.has(label.value)) {
      problems.push({
        code: 'duplicate-label',
        category: 'references',
        severity: 'warning',
        message: `The label \`${label.name}\` is already defined in this script, and the engine only finds the first one.`,
        line: label.line,
        start: label.start,
        end: label.end,
      })
      continue
    }

    seenLabels.add(label.value)
  }

  for (const reference of document.references) {
    if (reference.dynamic || seenLabels.has(reference.value)) {
      continue
    }

    problems.push({
      code: 'missing-label',
      category: 'references',
      severity: 'warning',
      message: `The label \`${reference.target}\` is not defined in this script. The \`${reference.kind}\` only fails when the execution reaches it.`,
      line: reference.line,
      start: reference.start,
      end: reference.end,
    })
  }

  return problems
}

/**
 * Checks the event blocks for a missing terminator.
 */
function checkTerminators(document: ParsedDocument): Problem[] {
  const problems: Problem[] = []

  for (const event of document.events) {
    if (event.disabled || event.closeLine === null) {
      continue
    }

    const { closeLine } = event
    const statements = document.statements.filter((statement) => {
      return statement.line > event.line && statement.line < closeLine
    })
    const lastStatement = statements.at(-1)

    if (lastStatement === undefined || TERMINATORS.has(lastStatement.value)) {
      continue
    }

    problems.push({
      code: 'missing-terminator',
      category: 'structure',
      severity: 'information',
      message: 'The event block ends without `accept`, `refuse` or `return`. The engine logs a warning for this.',
      line: lastStatement.line,
      start: lastStatement.start,
      end: lastStatement.end,
    })
  }

  return problems
}

/**
 * Runs the analysis on the document.
 */
export function analyze(document: ParsedDocument, options: AnalysisOptions = DEFAULT_ANALYSIS_OPTIONS): Problem[] {
  const problems: Problem[] = []

  for (const problem of document.problems) {
    if (problem.category === 'strings' && !options.strings) {
      continue
    }

    if (problem.category === 'structure' && !options.structure) {
      continue
    }

    problems.push(problem)
  }

  if (options.commands) {
    problems.push(...checkCommands(document), ...checkSetTargets(document))
  }

  if (options.structure) {
    problems.push(...checkConditions(document))

    if (options.missingTerminator) {
      problems.push(...checkTerminators(document))
    }
  }

  if (options.references) {
    problems.push(...checkEvents(document), ...checkReferences(document))
  }

  return problems.toSorted((left, right) => {
    if (left.line !== right.line) {
      return left.line - right.line
    }

    return left.start - right.start
  })
}
