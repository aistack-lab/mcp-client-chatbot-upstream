import JSON5 from 'json5';

/**
 * Parses a JSON string with JSON5, which is more tolerant of syntax variations
 * like trailing commas, comments, and unquoted keys.
 * 
 * @param json The JSON string to parse
 * @returns Object with success status and either the parsed value or an error
 */
export function parseJSON5<T = unknown>(
  json: string,
): {
  success: true;
  value: T;
  error?: undefined;
} | {
  success: false;
  error: unknown;
  value?: undefined;
} {
  try {
    const parsed = JSON5.parse(json);
    return {
      success: true,
      value: parsed as T,
    };
  } catch (e) {
    return {
      success: false,
      error: e,
    };
  }
}

/**
 * Attempts to parse a string as JSON5, falling back to standard JSON if needed.
 * This is useful for ensuring backward compatibility.
 * 
 * @param str The string to parse
 * @returns Object with success status and either the parsed data or undefined
 */
export function tryParseJSON5<T = unknown>(
  str: string,
): { success: true; data: T } | { success: false; data: undefined } {
  try {
    return { success: true, data: JSON5.parse(str) as T };
  } catch {
    return { success: false, data: undefined };
  }
}

/**
 * Stringifies a value to a JSON string using JSON5.
 * 
 * @param value The value to stringify
 * @param replacer A function that transforms the results
 * @param space Adds indentation, white space, and line breaks
 * @returns The JSON5 string
 */
export function stringifyJSON5(
  value: any,
  replacer?: ((key: string, value: any) => any) | null,
  space?: string | number | null
): string {
  return JSON5.stringify(value, replacer || null, space || null);
}