// the decoding of the original script files. the game reads them as ISO-8859-1/15, and a part of
// the corpus ends with a `\0` byte, which the editor treats as a binary marker.

/**
 * The NUL byte, which the editor treats as a binary marker.
 */
const NUL_BYTE = '\u{0}'

/**
 * Decodes the bytes of a script.
 *
 * The game stores the scripts as ISO-8859-1/15 (`§` is `0xa7`, `£` is `0xa3`). The NUL bytes are
 * dropped: the editor refuses to display a file that contains one, and the engine treats them as
 * whitespace anyway.
 *
 * @param data The bytes of the file.
 * @returns The text of the script.
 */
export function decodeScript(data: Uint8Array): string {
  let text: string

  try {
    text = new TextDecoder('iso-8859-15').decode(data)
  } catch {
    // a runtime without the full ICU falls back to the plain latin1
    text = new TextDecoder('latin1').decode(data)
  }

  return text.replaceAll(NUL_BYTE, '')
}
