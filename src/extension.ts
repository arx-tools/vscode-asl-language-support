// the vscode side of the extension: it wires the pure language service of `src/asl` into the editor.
// every decision (what is a command, where the labels are, what is a problem) happens in the pure
// modules, so those are covered by the node tests, and this file only adapts the types.

import * as vscode from 'vscode'
import { analyze, type AnalysisOptions } from './asl/analysis.ts'
import { getCompletions, type CompletionEntry } from './asl/completion.ts'
import { getDefinition } from './asl/definitions.ts'
import { getFoldingRanges } from './asl/folding.ts'
import { getHover } from './asl/hover.ts'
import { parseDocument } from './asl/parser.ts'
import { getDocumentSymbols, type DocumentSymbolEntry } from './asl/symbols.ts'
import type { ParsedDocument, Problem, Severity } from './asl/types.ts'

/**
 * The identifier of the language, as it is declared in the manifest.
 */
const LANGUAGE_ID = 'asl'

/**
 * The section of the settings.
 */
const SETTINGS_SECTION = 'asl'

/**
 * The name of the diagnostics source that the problems are reported under.
 */
const DIAGNOSTIC_SOURCE = 'asl'

/**
 * The characters that trigger the completion list.
 */
const COMPLETION_TRIGGER_CHARACTERS = ['~', '^', '§', '£', '@', '#', '&', '$']

/**
 * Parses a document.
 */
function parse(document: vscode.TextDocument): ParsedDocument {
  return parseDocument(document.getText())
}

/**
 * Clamps a character offset to the length of the line.
 */
function clampCharacter(document: vscode.TextDocument, line: number, character: number): number {
  const lineLength = document.lineAt(line).text.length

  if (character > lineLength) {
    return lineLength
  }

  return character
}

/**
 * Creates a range from the line and the character offsets of a problem.
 */
function createRange(document: vscode.TextDocument, line: number, start: number, end: number): vscode.Range {
  return new vscode.Range(line, clampCharacter(document, line, start), line, clampCharacter(document, line, end))
}

/**
 * Converts the severity of the language service to the severity of the editor.
 */
function toDiagnosticSeverity(severity: Severity): vscode.DiagnosticSeverity {
  if (severity === 'error') {
    return vscode.DiagnosticSeverity.Error
  }

  if (severity === 'warning') {
    return vscode.DiagnosticSeverity.Warning
  }

  return vscode.DiagnosticSeverity.Information
}

/**
 * Converts the kind of a completion to the kind of the editor.
 */
function toCompletionItemKind(kind: CompletionEntry['kind']): vscode.CompletionItemKind {
  if (kind === 'command') {
    return vscode.CompletionItemKind.Function
  }

  if (kind === 'event') {
    return vscode.CompletionItemKind.Event
  }

  if (kind === 'label') {
    return vscode.CompletionItemKind.Reference
  }

  if (kind === 'subcommand') {
    return vscode.CompletionItemKind.EnumMember
  }

  if (kind === 'systemVariable') {
    return vscode.CompletionItemKind.Constant
  }

  return vscode.CompletionItemKind.Variable
}

/**
 * Converts the kind of an outline entry to the kind of the editor.
 */
function toSymbolKind(kind: DocumentSymbolEntry['kind']): vscode.SymbolKind {
  if (kind === 'event') {
    return vscode.SymbolKind.Event
  }

  return vscode.SymbolKind.Constant
}

/**
 * Reads the switches of the analysis from the settings.
 */
function readAnalysisOptions(): AnalysisOptions {
  const configuration = vscode.workspace.getConfiguration(SETTINGS_SECTION)

  return {
    commands: configuration.get<boolean>('diagnostics.commands', true),
    structure: configuration.get<boolean>('diagnostics.structure', true),
    references: configuration.get<boolean>('diagnostics.references', true),
    strings: configuration.get<boolean>('diagnostics.strings', true),
    missingTerminator: configuration.get<boolean>('diagnostics.missingTerminator', false),
  }
}

/**
 * Tells whether the diagnostics are enabled.
 */
function isDiagnosticsEnabled(): boolean {
  return vscode.workspace.getConfiguration(SETTINGS_SECTION).get<boolean>('diagnostics.enabled', true)
}

/**
 * The diagnostic collection of the `.asl` documents.
 */
class DiagnosticManager {
  /**
   * The collection that holds the problems.
   */
  private readonly collection: vscode.DiagnosticCollection

  /**
   * Creates the manager.
   */
  public constructor() {
    this.collection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE)
  }

  /**
   * Replaces the problems of a document.
   */
  public update(document: vscode.TextDocument): void {
    if (document.languageId !== LANGUAGE_ID) {
      return
    }

    if (!isDiagnosticsEnabled()) {
      this.collection.delete(document.uri)
      return
    }

    const problems = analyze(parse(document), readAnalysisOptions())

    this.collection.set(
      document.uri,
      problems.map((problem) => {
        return this.createDiagnostic(document, problem)
      }),
    )
  }

  /**
   * Clears the problems of a document.
   */
  public clear(document: vscode.TextDocument): void {
    this.collection.delete(document.uri)
  }

  /**
   * Clears every problem and releases the collection.
   */
  public dispose(): void {
    this.collection.dispose()
  }

  /**
   * Converts a problem to a diagnostic.
   */
  private createDiagnostic(document: vscode.TextDocument, problem: Problem): vscode.Diagnostic {
    const range = createRange(document, problem.line, problem.start, problem.end)
    const diagnostic = new vscode.Diagnostic(range, problem.message, toDiagnosticSeverity(problem.severity))

    diagnostic.code = problem.code
    diagnostic.source = DIAGNOSTIC_SOURCE

    return diagnostic
  }
}

/**
 * The completion provider of the language.
 */
class AslCompletionProvider implements vscode.CompletionItemProvider {
  /**
   * Returns the completions of a position.
   */
  public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
    return getCompletions(parse(document), position.line, position.character).map((entry) => {
      const item = new vscode.CompletionItem(entry.label, toCompletionItemKind(entry.kind))

      item.insertText = entry.insertText
      item.detail = entry.detail

      return item
    })
  }
}

/**
 * The hover provider of the language.
 */
class AslHoverProvider implements vscode.HoverProvider {
  /**
   * Returns the hover of a position.
   */
  public provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const result = getHover(parse(document), position.line, position.character)

    if (result === null) {
      return undefined
    }

    const contents = new vscode.MarkdownString(result.contents)
    const range = createRange(document, position.line, result.start, result.end)

    return new vscode.Hover(contents, range)
  }
}

/**
 * The definition provider of the language.
 */
class AslDefinitionProvider implements vscode.DefinitionProvider {
  /**
   * Returns the definition of a position.
   */
  public provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.Location | undefined {
    const target = getDefinition(parse(document), position.line, position.character)

    if (target === null) {
      return undefined
    }

    return new vscode.Location(document.uri, createRange(document, target.line, target.start, target.end))
  }
}

/**
 * The outline provider of the language.
 */
class AslDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  /**
   * Returns the outline of a document.
   */
  public provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
    return getDocumentSymbols(parse(document)).map((entry) => {
      return this.createSymbol(document, entry)
    })
  }

  /**
   * Converts an outline entry to a document symbol.
   */
  private createSymbol(document: vscode.TextDocument, entry: DocumentSymbolEntry): vscode.DocumentSymbol {
    const selectionRange = createRange(document, entry.line, entry.start, entry.end)
    const fullRange = document.lineAt(entry.line).range
    const symbol = new vscode.DocumentSymbol(
      entry.name,
      entry.detail,
      toSymbolKind(entry.kind),
      fullRange,
      selectionRange,
    )

    symbol.children = entry.children.map((child) => {
      return this.createSymbol(document, child)
    })

    return symbol
  }
}

/**
 * The folding range provider of the language.
 */
class AslFoldingRangeProvider implements vscode.FoldingRangeProvider {
  /**
   * Returns the folding ranges of a document.
   */
  public provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
    return getFoldingRanges(parse(document)).map((range) => {
      if (range.kind === 'event') {
        return new vscode.FoldingRange(range.startLine, range.endLine, vscode.FoldingRangeKind.Region)
      }

      return new vscode.FoldingRange(range.startLine, range.endLine)
    })
  }
}

/**
 * Activates the extension.
 */
export function activate(context: vscode.ExtensionContext): void {
  const selector: vscode.DocumentSelector = { language: LANGUAGE_ID }
  const diagnostics = new DiagnosticManager()

  context.subscriptions.push(
    diagnostics,
    vscode.workspace.onDidOpenTextDocument((document) => {
      diagnostics.update(document)
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      diagnostics.update(event.document)
    }),
    vscode.workspace.onDidCloseTextDocument((document) => {
      diagnostics.clear(document)
    }),
    vscode.workspace.onDidChangeConfiguration(() => {
      for (const document of vscode.workspace.textDocuments) {
        diagnostics.update(document)
      }
    }),
    vscode.languages.registerCompletionItemProvider(
      selector,
      new AslCompletionProvider(),
      ...COMPLETION_TRIGGER_CHARACTERS,
    ),
    vscode.languages.registerHoverProvider(selector, new AslHoverProvider()),
    vscode.languages.registerDefinitionProvider(selector, new AslDefinitionProvider()),
    vscode.languages.registerDocumentSymbolProvider(selector, new AslDocumentSymbolProvider()),
    vscode.languages.registerFoldingRangeProvider(selector, new AslFoldingRangeProvider()),
  )

  for (const document of vscode.workspace.textDocuments) {
    diagnostics.update(document)
  }
}
