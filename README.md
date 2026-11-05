# Arx Scripting Language support

Language support for the script files of **Arx Fatalis** (`.asl`, the Arx Scripting Language) in
Visual Studio Code.

The AL is the little language that drives the entities of the game: it has commands, events,
labels, variables with sigils and no parser at all — the engine tokenizes the file while it runs it.
This extension gives the editor the same view of the language.

## Features

**Syntax highlighting** (TextMate grammar)

- the comments (`//`), the strings and the `~name~` interpolations,
- the commands of Arx Libertatis 1.2.1, with or without underscores (`SETMATERIAL`, `set_material`),
- the events (`ON INIT {`), the labels (`>>name`), the `goto`/`gosub` targets,
- the variables by their sigil: `#` `&` `$` (global), `§` `@` `£` (entity), `^` (system),
- the numbers, the flags (`-m`), the operators (`==`, `isclass`, `!isgroup`, …) and the braces.

**Diagnostics** (the squiggles)

- an unknown command, with the closest known command as a suggestion — the same check as the game:
  case-insensitive, underscores ignored, and every `timer<name>` accepted,
- a `set` without a variable target (the engine logs `Unknown variable type` and does nothing),
- an `if` that does not have three words, or that has an unknown operator — a glued `x==1` silently
  makes the condition always true,
- a `{` that is missing after an `on` event (the engine skips the whole block),
- an unbalanced brace, a stray `}`,
- a `goto`/`gosub` to a label that does not exist,
- a duplicated `on` event or label (the engine only finds the first one),
- an unterminated string or an unmatched `~`.

The diagnostics are switchable per group in the settings (`asl.diagnostics.*`). The missing
`accept`/`refuse` at the end of an event block is off by default, because the original scripts are
full of them.

**Editor features**

- **completion**: the commands at the start of a line, the events after `on`, the labels after
  `goto`/`gosub`, the variables of the document after `set`, the subcommands after `inventory`,
  `behavior`, `tweak` and `spawn`, and the system variables inside `~...~`,
- **hover**: a short description of the command and a link to the wiki catalogue, the scope and the
  first assignment of a variable, the definition line of a label,
- **go to definition**: from a `goto`/`gosub` to its label, from a variable to its first `set`,
- **outline**: the event handlers with the labels they contain,
- **folding**: the event blocks and every brace pair,

- **snippets**: the usual blocks (`on init`, `if`/`else`, `sendevent`, `timer`, subroutine, …).

**File defaults** (the game reads ISO-8859-1/15 with CRLF)

- `files.encoding` = `iso885915`, `files.eol` = `\r\n`, 2 spaces, no tab, no indentation detection.
  These are defaults only: the user settings still win.

## Settings

| Setting                             | Default | What it does                                                       |
| ----------------------------------- | ------- | ------------------------------------------------------------------ |
| `asl.diagnostics.enabled`           | `true`  | Turns the diagnostics on or off.                                   |
| `asl.diagnostics.commands`          | `true`  | Unknown commands and a `set` without a variable.                   |
| `asl.diagnostics.structure`         | `true`  | Unbalanced braces, a missing `{` after an event, a malformed `if`. |
| `asl.diagnostics.references`        | `true`  | A missing label, a duplicated label or event.                      |
| `asl.diagnostics.strings`           | `true`  | An unterminated string or an unmatched `~`.                        |
| `asl.diagnostics.missingTerminator` | `false` | An event block without `accept`, `refuse` or `return`.             |

## Install

From the Marketplace:

```sh
code --install-extension arx-tools.arx-scripting-language-support
```

Or search for **Arx Scripting Language support** in the Extensions view of VS Code.

For development: open this folder in VS Code and press `F5` — a second window (the Extension
Development Host) starts with the extension loaded. To install a local build: `npm run vsix`, then
`code --install-extension arx-scripting-language-support-0.1.0.vsix`.

## Development

```sh
npm install
npm run build     # bundles src into dist/extension.js (the manifest entry point)
npm run lint      # xo
npm run typecheck # tsc, four projects
npm test          # node --test through arx-lib-test
```

The `pre-commit` hook runs `lint`, `typecheck` and `test`.

**The corpus test** is opt-in, because the original scripts are not part of the repository:

```sh
ASL_CORPUS_DIR=/path/to/extracted-pak-files/final/GRAPH/obj3d/interactive npm test
```

It parses all 3488 original scripts and asserts the numbers of the corpus analysis: 9693 event
blocks, 3039 labels, and the 20 unknown command names (the typos of the original scripts).

**The engine metadata is generated**, never edited by hand:

```sh
node scripts/extract-al-metadata.ts ../ArxLibertatis/src/script   # reads the C++ sources
node scripts/generate.ts                                          # writes the metadata + the grammar
```

The extracted lists live in `data/` and they are committed, so a normal build does not need an Arx
Libertatis checkout. See [`data/README.md`](data/README.md).

## The layout

| Path                            | What is it                                                               |
| ------------------------------- | ------------------------------------------------------------------------ |
| `package.json`                  | the manifest: the language, the grammar, the snippets, the settings      |
| `language-configuration.json`   | comments, brackets, indentation, the word pattern                        |
| `syntaxes/asl.tmLanguage.json`  | the generated TextMate grammar                                           |
| `snippets/asl.json`             | the snippets                                                             |
| `src/extension.ts`              | the VS Code side: the providers and the diagnostic collection            |
| `src/asl/`                      | the language service, without the `vscode` module (so it is testable)    |
| `src/asl/lexer.ts`              | the tokenizer, following the engine's `getWord()`/`getCommand()`         |
| `src/asl/parser.ts`             | the line oriented collector of the events, labels, references and braces |
| `src/asl/analysis.ts`           | the checks                                                               |
| `src/asl/metadata.generated.ts` | the generated command, event and system variable tables                  |
| `data/`                         | the extracted engine data and its README                                 |
| `tests/`                        | `node:test` specs, mirroring `src/`                                      |

## Known limitations

- The original scripts often end with a `\0` byte (883 of the 3488 files). VS Code decides that a
  file is binary from a `\0` **in the first 512 bytes** (`ZERO_BYTE_DETECTION_BUFFER_MAX_LEN` in
  `src/vs/workbench/services/textfile/common/encoding.ts`), so 622 of the 3488 files show the
  warning instead of the text. The built-in way to open them: click **Binary** in the status bar
  and pick **Arx Scripting Language**; the extension belongs to `iso885915`, so the file decodes
  correctly as well. When a file is opened as plain text (`Open Anyway`), the extension restores the
  `asl` language too — the warning itself comes from the editor's binary flag, which no extension
  can clear.
- 255 of the original files use the uppercase `.ASL` extension; both cases are associated.
- The parser is line oriented, like the engine: a command never continues on the next line. A line
  with more than one command (`IF (...) ACCEPT`) is checked as a whole, but only its first command is
  checked for the command name.
- The custom event names are not validated — they are part of the script to script communication.
- The subcommand words are not validated (only completed): `inventory add` is checked as `inventory`.
- The original scripts are full of intentional mistakes: the game silences them with a byte offset
  list in the C++ (`initSuppressions()`), which is not reproduced here. The diagnostics will report
  them, which is the point of a linter, but it can be noisy on an untouched original file.
- There is no formatter.

## Notes on the language

- The engine lowercases the whole script with a C locale and removes every underscore from the
  command name, so `SETMATERIAL`, `set_material` and `SetMaterial` are the same command.
- `(` and `)` are **separators**, not brackets: `IF (x == 1)` is the same as `IF x == 1`.
- There is no escape character in a string, and a string cannot span lines.
- A `>>_label` or an `on _event` is a block that the game never reaches — the original scripts use
  it to comment out code without moving the byte positions.

## Credits

The command, event and system variable names are extracted from the sources of
[Arx Libertatis](https://github.com/arx/ArxLibertatis) (GPLv3+). Only the names and the facts about
the language are used here — no engine code.

## License

MIT
