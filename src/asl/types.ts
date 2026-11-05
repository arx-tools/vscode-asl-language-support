// the shared types of the language service. everything in this folder is free of the `vscode`
// module, so the whole pipeline can be tested with the node test runner.

/**
 * A system variable of the engine.
 *
 * A family (`prefix: true`) matches every name that starts with the stored name, for example
 * `^dist_` covers `^dist_player`.
 */
export type SystemVariable = {
  /**
   * The name of the variable, without the `*` of the data file.
   */
  name: string
  /**
   * Whether the name is a prefix family instead of an exact name.
   */
  prefix: boolean
}

/**
 * The kind of a token.
 *
 * The classification follows the engine's `getWord()`: the sigil of a word decides whether it is a
 * variable, and the number and the flags are separate kinds because they are rendered differently.
 */
export type TokenKind =
  | 'comment'
  | 'flag'
  | 'interpolation'
  | 'label'
  | 'number'
  | 'punctuation'
  | 'string'
  | 'systemVariable'
  | 'variable'
  | 'word'

/**
 * A token of a line.
 *
 * The positions are utf-16 code unit offsets inside the line, which is what the `vscode` api calls
 * `character` as well.
 */
export type Token = {
  /**
   * The kind of the token.
   */
  kind: TokenKind
  /**
   * The text of the token as it is written in the file.
   */
  text: string
  /**
   * The ascii-lowercased text, which is how the engine compares the commands and the labels.
   */
  value: string
  /**
   * The offset of the first character.
   */
  start: number
  /**
   * The offset after the last character.
   */
  end: number
  /**
   * Whether a string or an interpolation was closed. Other kinds are always closed.
   */
  closed: boolean
}

/**
 * A line of the document with its tokens.
 */
export type DocumentLine = {
  /**
   * The zero based line number.
   */
  index: number
  /**
   * The text of the line, without the line break.
   */
  text: string
  /**
   * The tokens of the line, the comments included.
   */
  tokens: Token[]
  /**
   * The problems that the tokenizer found on the line.
   */
  problems: Problem[]
}

/**
 * A `{` or a `}` of the document, with the pair of the matching brace.
 */
export type BraceToken = {
  /**
   * The line of the brace.
   */
  line: number
  /**
   * The offset of the brace inside the line.
   */
  start: number
  /**
   * The offset after the brace, which is `start + 1`.
   */
  end: number
  /**
   * Whether this is an opening brace.
   */
  open: boolean
  /**
   * The index of the matching brace, or `-1` when it is unbalanced.
   */
  match: number
}

/**
 * An `on <event> { ... }` block.
 */
export type EventBlock = {
  /**
   * The name of the event as written in the file.
   */
  name: string
  /**
   * The ascii-lowercased name of the event.
   */
  value: string
  /**
   * The line of the `on` keyword.
   */
  line: number
  /**
   * The offset of the event name inside the line.
   */
  start: number
  /**
   * The offset after the event name.
   */
  end: number
  /**
   * The line of the opening brace, or `null` when the block has no opening brace.
   */
  openBraceLine: number | null
  /**
   * The line of the closing brace, or `null` when the block is not closed or has no opening brace.
   */
  closeLine: number | null
  /**
   * The brace depth of the `on` keyword.
   */
  depth: number
  /**
   * Whether the name starts with an underscore, which is the game's way of disabling the block.
   */
  disabled: boolean
}

/**
 * A `>>label` of the document.
 */
export type LabelToken = {
  /**
   * The name of the label, without the `>>`.
   */
  name: string
  /**
   * The ascii-lowercased name of the label.
   */
  value: string
  /**
   * The line of the label.
   */
  line: number
  /**
   * The offset of the name inside the line.
   */
  start: number
  /**
   * The offset after the name.
   */
  end: number
  /**
   * Whether the name starts with an underscore, which is the game's way of disabling the label.
   */
  disabled: boolean
}

/**
 * A `goto` or a `gosub` command.
 */
export type ReferenceToken = {
  /**
   * The command that made the reference.
   */
  kind: 'goto' | 'gosub'
  /**
   * The target as written in the file.
   */
  target: string
  /**
   * The ascii-lowercased target.
   */
  value: string
  /**
   * The line of the reference.
   */
  line: number
  /**
   * The offset of the target inside the line.
   */
  start: number
  /**
   * The offset after the target.
   */
  end: number
  /**
   * Whether the target is an interpolation (`~£name~`), which cannot be resolved statically.
   */
  dynamic: boolean
}

/**
 * The first command of a line.
 */
export type Statement = {
  /**
   * The command as written in the file.
   */
  name: string
  /**
   * The ascii-lowercased command, with the underscores removed.
   */
  value: string
  /**
   * The line of the command.
   */
  line: number
  /**
   * The offset of the command inside the line.
   */
  start: number
  /**
   * The offset after the command.
   */
  end: number
  /**
   * The tokens of the line, the comment excluded.
   */
  tokens: Token[]
}

/**
 * A variable that the document assigns with `set`.
 */
export type VariableUse = {
  /**
   * The name of the variable, the sigil included.
   */
  name: string
  /**
   * The ascii-lowercased name of the variable.
   */
  value: string
  /**
   * The line of the assignment.
   */
  line: number
  /**
   * The offset of the name inside the line.
   */
  start: number
  /**
   * The offset after the name.
   */
  end: number
  /**
   * Whether this is the first assignment of the variable in the document.
   */
  first: boolean
}

/**
 * The severity of a problem, mirroring the three `vscode.DiagnosticSeverity` levels that the
 * language uses.
 */
export type Severity = 'error' | 'information' | 'warning'

/**
 * The category of a problem, which is what the settings switch on and off.
 */
export type ProblemCategory = 'commands' | 'references' | 'strings' | 'structure'

/**
 * A problem of the document.
 */
export type Problem = {
  /**
   * The stable identifier of the check, for example `unknown-command`.
   */
  code: string
  /**
   * The category of the check.
   */
  category: ProblemCategory
  /**
   * The severity of the problem.
   */
  severity: Severity
  /**
   * The message that is shown to the user.
   */
  message: string
  /**
   * The line of the problem.
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
 * The result of the parse: the lines with their tokens and every fact that the language features
 * need.
 */
export type ParsedDocument = {
  /**
   * The lines of the document with their tokens.
   */
  lines: DocumentLine[]
  /**
   * The event blocks of the document.
   */
  events: EventBlock[]
  /**
   * The labels of the document.
   */
  labels: LabelToken[]
  /**
   * The `goto` and `gosub` commands of the document.
   */
  references: ReferenceToken[]
  /**
   * The first command of every line.
   */
  statements: Statement[]
  /**
   * The braces of the document.
   */
  braces: BraceToken[]
  /**
   * The variables that the document assigns.
   */
  variables: VariableUse[]
  /**
   * The problems that the parser found (the strings and the braces).
   */
  problems: Problem[]
}
