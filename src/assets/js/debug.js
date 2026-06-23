/**
 * Central dev-logging switch for the theme.
 *
 *   true  → console logs ON  (development)
 *   false → console logs OFF (set this before publishing the theme)
 *
 * Only `log()` / `warn()` are gated by this flag. Real `console.error`
 * calls are left untouched so genuine failures still surface in production.
 */
export const DEBUG = true;

export const log  = (...args) => { if (DEBUG) console.log(...args); };
export const warn = (...args) => { if (DEBUG) console.warn(...args); };
