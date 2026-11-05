import { createXoConfig } from '@arx-tools/config'
import type { FlatXoConfig } from 'xo'

// the annotation keeps the type portability: without it the inferred type points into the
// `node_modules` of the package, which typescript does not accept
const xoConfig: FlatXoConfig = [
  ...createXoConfig(),
  {
    // the tokenizer and the extractor regexes follow the engine's own patterns: the capture groups
    // are positional (the code reads them by index) and the character classes carry the exact byte
    // ranges of the engine, so these stylistic rules would only add noise
    rules: {
      'regexp/prefer-named-capture-group': 'off',
      'regexp/sort-character-class-elements': 'off',
      'regexp/no-super-linear-move': 'off',
    },
  },
  {
    // the shared configuration sets the object brace spacing only for the source folders, so the
    // json files (the language configuration and the snippets) would get the xo default
    files: ['**/*.json'],
    rules: {
      'prettier/prettier': ['error', { bracketSpacing: true }],
    },
  },
  {
    // the grammar is the output of `scripts/generate.ts`: the generator writes it with
    // `JSON.stringify`, so reformatting it would only come back as a diff on the next generation
    ignores: ['syntaxes/**', 'dist/**'],
  },
]

export default xoConfig
