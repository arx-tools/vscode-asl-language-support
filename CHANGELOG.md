# Change Log

All notable changes to the "arx-scripting-language-support" extension are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/).

## [0.2.0] - 2026-11-05

### Added

- The `Arx ASL: Open as readable text` command: it opens a script read only, with the language
  support, even when the editor treats the file as binary.

### Fixed

- The uppercase `.ASL` extension of the original corpus (255 files) is associated with the language.
- A script that the editor opens as plain text (the `\0` terminated files) gets the `asl` language
  back, so the highlighting and the diagnostics work after _Open Anyway_.

## [0.1.0] - 2026-11-05

### Added

- The language definition of `.asl` (Arx Fatalis scripting language), with the ISO-8859-15/CRLF
  file defaults and the 2 space indentation.
- The TextMate grammar: comments, strings, `~name~` interpolations, commands, events, labels,
  variables by sigil, numbers, flags, operators and braces.
- The diagnostics: unknown command (with a suggestion), a `set` without a variable, a malformed
  `if`, a missing brace after an event, unbalanced braces, a missing or duplicated label, a
  duplicated event, and the string problems.
- The completions of the commands, events, labels, variables, subcommands and system variables.
- The hover, the go to definition, the outline and the folding.
- The snippets of the usual blocks.
- The extractor and the generator of the engine metadata (`data/`).
