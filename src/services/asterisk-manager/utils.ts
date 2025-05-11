/**
 * Utility functions for the Asterisk Manager Interface
 */

/**
 * Check if a string has length
 */
export function stringHasLength(line: string | null | undefined): boolean {
  return Boolean(line && line.length)
}

/**
 * Get a default callback function if none provided
 */
export type CallbackFunction<T = any> = (err?: Error | null, result?: T) => void

export function defaultCallback<T = any>(callback?: CallbackFunction<T>): CallbackFunction<T> {
  return typeof callback === 'function' ? callback : () => {}
}

/**
 * Remove leading and trailing spaces from a string
 */
export function removeSpaces(string?: string): string {
  return (string || '').replace(/^\s*|\s*$/g, '')
}
