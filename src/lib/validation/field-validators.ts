/**
 * TRIPDESK FIELD VALIDATORS & INTEGRITY UTILITIES
 *
 * Centralized business validation primitives for numeric inputs, telephone numbers,
 * monetary amounts, percentages, and restricted-format fields across both client (Formik/Yup)
 * and server (Zod/API/Excel) pipelines.
 *
 * Requirements:
 * - Phone numbers: String type, preserves leading zeros, permits '+' and standard phone characters,
 *   rejects alphabetic characters and scientific notation, validates 7-15 digits.
 * - Whole numbers: Digits only, no letters, no decimals, no exponent notation.
 * - Monetary amounts: Valid finite decimal numbers, no scientific notation, no multiple dots.
 * - Locked GST tax rates: 0%, 5%, 12%, 18%, 28%.
 */

export const PHONE_REGEX = /^\+?[0-9\s\-()]{7,25}$/;
export const LOCKED_GST_RATES = [0, 5, 12, 18, 28] as const;

/**
 * Validates a telephone or mobile number string.
 * Preserves leading zeros and international dialing prefixes.
 * Rejects alphabetic characters, scientific notation, and arbitrary symbols.
 * Rejects unbalanced or malformed parentheses and duplicate plus signs.
 * Enforces 7 to 15 digits total.
 */
export function isValidPhoneNumber(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const str = String(value).trim();
  if (!str) return false;

  // Reject letters or exponent notation immediately
  if (/[a-zA-Z]/.test(str)) return false;

  // Reject plus signs if not at start, or if more than one plus
  if (str.includes("+")) {
    if (!str.startsWith("+") || (str.match(/\+/g) || []).length > 1) {
      return false;
    }
  }

  // Check balanced parentheses (at most one pair of parentheses enclosing digits)
  const openParens = (str.match(/\(/g) || []).length;
  const closeParens = (str.match(/\)/g) || []).length;
  if (openParens !== closeParens || openParens > 1) {
    return false;
  }
  if (openParens === 1) {
    const openIdx = str.indexOf("(");
    const closeIdx = str.indexOf(")");
    if (openIdx >= closeIdx) return false;
    const inner = str.slice(openIdx + 1, closeIdx).trim();
    // Inner must contain digits only (with optional internal space) and cannot be empty
    if (!inner || !/^\d[\d\s]*\d$|^\d+$/.test(inner)) {
      return false;
    }
  }

  // Test character whitelist
  if (!PHONE_REGEX.test(str)) return false;

  // Count pure numeric digits
  const digits = str.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Blocks exponent keys ('e', 'E', '+') on numeric inputs to prevent accidental scientific notation entry.
 * For non-negative fields, also blocks '-'.
 * For whole-number (integer) fields, also blocks '.'.
 */
export function blockNumericKey(
  e: React.KeyboardEvent<HTMLInputElement>,
  options?: { allowDecimal?: boolean; allowNegative?: boolean }
) {
  if (e.key === "e" || e.key === "E" || e.key === "+") {
    e.preventDefault();
  }
  if (!options?.allowNegative && e.key === "-") {
    e.preventDefault();
  }
  if (!options?.allowDecimal && e.key === ".") {
    e.preventDefault();
  }
}

/**
 * Sanitizes or validates pasted content for numeric inputs.
 * If pasted text contains exponent notation ('e', 'E') or invalid characters, prevents default.
 */
export function sanitizeNumericPaste(
  e: React.ClipboardEvent<HTMLInputElement>,
  options?: { allowDecimal?: boolean; allowNegative?: boolean }
) {
  const text = e.clipboardData.getData("text");
  if (!text) return;
  const trimmed = text.trim();
  if (/[eE]/.test(trimmed)) {
    e.preventDefault();
    return;
  }
  const regex = options?.allowDecimal
    ? options?.allowNegative ? /^-?\d+(\.\d+)?$/ : /^\d+(\.\d+)?$/
    : options?.allowNegative ? /^-?\d+$/ : /^\d+$/;
  if (!regex.test(trimmed)) {
    e.preventDefault();
  }
}

/**
 * Validates whole-number (integer) input.
 * Rejects alphabetic characters, decimals, exponent notation (e.g. 1e5), NaN, Infinity.
 */
export function isValidInteger(
  value: unknown,
  options?: { min?: number; max?: number }
): boolean {
  if (value === null || value === undefined || value === "") return false;

  // Handle number type
  if (typeof value === "number") {
    if (!Number.isFinite(value) || isNaN(value) || !Number.isInteger(value)) return false;
    if (String(value).toLowerCase().includes("e")) return false;
    if (options?.min !== undefined && value < options.min) return false;
    if (options?.max !== undefined && value > options.max) return false;
    return true;
  }

  // Handle string type
  const str = String(value).trim();
  if (/[a-zA-Z]/.test(str)) return false;
  if (!/^-?\d+$/.test(str)) return false;
  if (options?.min !== undefined && options.min >= 0 && str.startsWith("-")) return false;

  const num = Number(str);
  if (!Number.isFinite(num) || !Number.isInteger(num)) return false;
  if (options?.min !== undefined && num < options.min) return false;
  if (options?.max !== undefined && num > options.max) return false;
  return true;
}

/**
 * Validates monetary and decimal values.
 * Rejects alphabetic characters, exponent notation (e.g. 1e5), multiple decimal points, NaN, Infinity.
 */
export function isValidDecimal(
  value: unknown,
  options?: { min?: number; max?: number; allowNegative?: boolean }
): boolean {
  if (value === null || value === undefined || value === "") return false;

  // Handle number type
  if (typeof value === "number") {
    if (!Number.isFinite(value) || isNaN(value)) return false;
    if (String(value).toLowerCase().includes("e")) return false;
    if (!options?.allowNegative && value < 0) return false;
    if (options?.min !== undefined && value < options.min) return false;
    if (options?.max !== undefined && value > options.max) return false;
    return true;
  }

  // Handle string type
  const str = String(value).trim();
  if (/[a-zA-Z]/.test(str)) return false;
  const regex = options?.allowNegative ? /^-?\d+(\.\d+)?$/ : /^\d+(\.\d+)?$/;
  if (!regex.test(str)) return false;

  const num = Number(str);
  if (!Number.isFinite(num) || isNaN(num)) return false;
  if (!options?.allowNegative && num < 0) return false;
  if (options?.min !== undefined && num < options.min) return false;
  if (options?.max !== undefined && num > options.max) return false;
  return true;
}

/**
 * Validates a tax rate percentage against TripDesk's locked GST tax rates.
 */
export function isLockedGstRate(rate: number): boolean {
  return LOCKED_GST_RATES.includes(rate as any);
}
