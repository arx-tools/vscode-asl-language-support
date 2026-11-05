// the file name helpers of the extension. they live in the pure layer, so the rules stay testable
// without the `vscode` module.

/**
 * The pattern of an Arx script file name. The original corpus uses both the lowercase and the
 * uppercase extension (255 of the 3488 files end with `.ASL`).
 */
const ASL_FILE_NAME_PATTERN = /\.asl$/i

/**
 * Tells whether the file name looks like an Arx script.
 *
 * @param fileName The name (or the full path) of the file.
 * @returns Whether the file is an `.asl` script, in any case.
 */
export function isAslFileName(fileName: string): boolean {
  return ASL_FILE_NAME_PATTERN.test(fileName)
}
