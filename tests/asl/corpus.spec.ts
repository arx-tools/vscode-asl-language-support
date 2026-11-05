// the corpus test runs against the original scripts of the game. it is opt-in, because the corpus is
// not part of the repository: set the ASL_CORPUS_DIR environment variable to the folder of the .asl
// files (for example `extracted-pak-files/final/GRAPH/obj3d/interactive`).
//
// the expected numbers come from the corpus analysis of the `.infos` notes, so this test proves that
// the parser agrees with the engine: the same 9693 event blocks, the same 3039 labels and the same 20
// unknown command names, on all 3488 files.

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import * as process from 'node:process'
import test, { type TestContext } from 'node:test'
import { analyze } from '../../src/asl/analysis.ts'
import { parseDocument } from '../../src/asl/parser.ts'

/**
 * The folder of the corpus, when the test is enabled.
 */
const CORPUS_DIRECTORY = process.env.ASL_CORPUS_DIR

/**
 * The number of the `.asl` files in the corpus.
 */
const EXPECTED_FILES = 3488

/**
 * The number of the event blocks in the corpus.
 */
const EXPECTED_EVENTS = 9693

/**
 * The number of the labels in the corpus.
 */
const EXPECTED_LABELS = 3039

/**
 * The unknown command names of the corpus. The original scripts are full of typos and of the
 * `_` disabled leftovers, and the game only reports them when the execution reaches the line.
 */
const EXPECTED_UNKNOWN_COMMANDS = [
  '/',
  'ACCET',
  'ACEPT',
  'BEHAVIOR_MOVE_TO',
  'BEHVAIOR',
  'COLLIONS',
  'COLLISIONS',
  'COLLISON',
  'COOK_GOBWATER',
  'DETROY',
  'DOWN',
  'FORECEANIM',
  'HIDE',
  'MAGIC_OFF',
  'N',
  'PLAYER_CONTROLS',
  'SATANGULAR',
  'WORLDFACE',
  'zdON',
]

/**
 * Returns every `.asl` file under a folder.
 */
async function findScripts(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await findScripts(fullPath)))
      continue
    }

    if (entry.name.toLowerCase().endsWith('.asl')) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Collects the statistics of the corpus.
 */
async function measureCorpus(files: string[]): Promise<{
  events: number
  labels: number
  unknownCommands: string[]
}> {
  let events = 0
  let labels = 0
  const unknownCommands = new Set<string>()

  for (const file of files) {
    // the corpus is ISO-8859-1/15, and `latin1` maps the § (0xa7) and £ (0xa3) bytes correctly
    const document = parseDocument(await readFile(file, 'latin1'))
    const problems = analyze(document)

    events = events + document.events.length
    labels = labels + document.labels.length

    for (const problem of problems) {
      if (problem.code !== 'unknown-command') {
        continue
      }

      const statement = document.statements.find((candidate) => {
        return candidate.line === problem.line && candidate.start === problem.start
      })

      if (statement !== undefined) {
        unknownCommands.add(statement.name)
      }
    }
  }

  return { events, labels, unknownCommands: [...unknownCommands].toSorted() }
}

void test('parses the original corpus', async (t: TestContext) => {
  if (CORPUS_DIRECTORY === undefined) {
    t.diagnostic('skipped: set the ASL_CORPUS_DIR environment variable to run this test')
    return
  }

  const files = await findScripts(CORPUS_DIRECTORY)
  const measurements = await measureCorpus(files)

  t.diagnostic(
    `${files.length} files, ${measurements.events} events, ${measurements.labels} labels, ${measurements.unknownCommands.length} unknown commands`,
  )

  t.assert.strictEqual(files.length, EXPECTED_FILES)
  t.assert.strictEqual(measurements.events, EXPECTED_EVENTS)
  t.assert.strictEqual(measurements.labels, EXPECTED_LABELS)
  // the corpus has 28 unknown statements: the extra one is a `}}` line, which has no word token
  t.assert.deepStrictEqual(measurements.unknownCommands, EXPECTED_UNKNOWN_COMMANDS.toSorted())
})
