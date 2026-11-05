// the file name helpers of the extension. they live in the pure layer, so the rules stay testable
// without the `vscode` module.

/**
 * The pattern of an Arx script file name. The original corpus uses both the lowercase and the
 * uppercase extension (255 of the 3488 files end with `.ASL`).
 */
const ASL_FILE_NAME_PATTERN = /\.asl$/i

/**
 * The language id that the editor gives a file that it detects as binary.
 */
export const BINARY_LANGUAGE_ID = 'code-text-binary'

/**
 * Tells whether the file name looks like an Arx script.
 *
 * @param fileName The name (or the full path) of the file.
 * @returns Whether the file is an `.asl` script, in any case.
 */
export function isAslFileName(fileName: string): boolean {
  return ASL_FILE_NAME_PATTERN.test(fileName)
}

/**
 * Tells whether the document needs the `asl` language.
 *
 * The editor gives `plaintext` to a document that was opened as text by hand (*Open Anyway*), and
 * `code-text-binary` to one that it still treats as binary; both have to be taken over.
 *
 * @param fileName The name (or the full path) of the file.
 * @param languageId The language that the document has.
 * @returns Whether the document is an Arx script that has to get the `asl` language.
 */
export function needsAslLanguage(fileName: string, languageId: string): boolean {
  if (!isAslFileName(fileName)) {
    return false
  }

  return languageId === 'plaintext' || languageId === BINARY_LANGUAGE_ID
}
