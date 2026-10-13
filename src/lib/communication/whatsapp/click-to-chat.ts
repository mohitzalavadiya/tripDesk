/**
 * WhatsApp Click-to-Chat Shared Utility
 * Centralizes phone normalization, validation, URL construction, and window opening.
 */

export interface PhoneValidationResult {
  valid: boolean;
  normalizedPhone?: string;
  error?: string;
}

export interface WhatsAppChatOpenResult {
  success: boolean;
  url?: string;
  normalizedPhone?: string;
  error?: string;
}

/**
 * Validates and normalizes phone numbers for WhatsApp Click-to-Chat.
 *
 * Rules:
 * 1. Indian 10-digit mobile numbers (starting with 6, 7, 8, 9) are converted to 91XXXXXXXXXX.
 * 2. Numbers already starting with +91 or 91 (12 digits total) avoid duplicate country codes.
 * 3. Domestic trunk prefix 0 followed by a 10-digit Indian mobile (11 digits total) is normalized to 91XXXXXXXXXX.
 * 4. International numbers with explicit '+' country prefix (8 to 15 digits) are preserved.
 * 5. Ambiguous numbers without country context or malformed inputs return clear error messages.
 */
export function validateAndNormalizeWhatsAppPhone(
  rawPhone: string | null | undefined,
  defaultCountryCode: string = "91"
): PhoneValidationResult {
  if (!rawPhone || !rawPhone.trim()) {
    return {
      valid: false,
      error: "Phone number is required.",
    };
  }

  const trimmed = rawPhone.trim();
  const hasPlusPrefix = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/[^0-9]/g, "");

  if (!digitsOnly || digitsOnly.length < 7) {
    return {
      valid: false,
      error: "Phone number is too short or invalid.",
    };
  }

  if (digitsOnly.length > 15) {
    return {
      valid: false,
      error: "Phone number exceeds maximum international length (15 digits).",
    };
  }

  // 1. Explicit + country code provided
  if (hasPlusPrefix) {
    // If +91 with Indian 10-digit mobile (12 digits total)
    if (digitsOnly.startsWith("91") && digitsOnly.length === 12) {
      const nationalPart = digitsOnly.substring(2);
      if (/^[6-9]\d{9}$/.test(nationalPart)) {
        return { valid: true, normalizedPhone: digitsOnly };
      }
    }
    // Generic valid international number with '+' prefix (8 to 15 digits)
    if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
      return { valid: true, normalizedPhone: digitsOnly };
    }
    return {
      valid: false,
      error: "Invalid international phone number format.",
    };
  }

  // 2. Already starts with 91 followed by a 10-digit Indian mobile (12 digits total)
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    const nationalPart = digitsOnly.substring(2);
    if (/^[6-9]\d{9}$/.test(nationalPart)) {
      return { valid: true, normalizedPhone: digitsOnly };
    }
  }

  // 3. Indian domestic trunk prefix: 0 followed by 10-digit Indian mobile (11 digits total)
  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    const nationalPart = digitsOnly.substring(1);
    if (/^[6-9]\d{9}$/.test(nationalPart)) {
      return { valid: true, normalizedPhone: `91${nationalPart}` };
    }
  }

  // 4. Standard 10-digit Indian mobile number
  if (digitsOnly.length === 10) {
    if (/^[6-9]\d{9}$/.test(digitsOnly)) {
      return { valid: true, normalizedPhone: `${defaultCountryCode}${digitsOnly}` };
    }
    return {
      valid: false,
      error:
        "10-digit number is not a valid Indian mobile number. Please include the full international country code with '+' (e.g. +91 9876543210).",
    };
  }

  // 5. Ambiguous length without '+' prefix (e.g. 11-14 digits)
  // If default country code is 91 and it doesn't match standard patterns, require '+' prefix
  return {
    valid: false,
    error:
      "Ambiguous phone number format. Please provide international format with '+' (e.g. +91 9876543210).",
  };
}

/**
 * Builds a compliant WhatsApp Click-to-Chat URL (wa.me).
 *
 * @param phone Recipient phone number (normalized or raw)
 * @param message Optional message body to prefill
 */
export function buildWhatsAppChatUrl(phone: string, message?: string | null): string {
  const norm = validateAndNormalizeWhatsAppPhone(phone);
  if (!norm.valid || !norm.normalizedPhone) {
    throw new Error(norm.error || "Invalid phone number for WhatsApp chat.");
  }

  const baseUrl = `https://wa.me/${norm.normalizedPhone}`;
  if (message && message.trim()) {
    const encoded = encodeURIComponent(message.trim());
    return `${baseUrl}?text=${encoded}`;
  }
  return baseUrl;
}

/**
 * Validates recipient, constructs Click-to-Chat URL, and opens WhatsApp in a new tab.
 *
 * @param phone Recipient phone number
 * @param message Optional message body to prefill
 * @param options Additional options (e.g. defaultCountryCode)
 */
export function openWhatsAppChat(
  phone: string | null | undefined,
  message?: string | null,
  options?: { defaultCountryCode?: string }
): WhatsAppChatOpenResult {
  const validation = validateAndNormalizeWhatsAppPhone(
    phone,
    options?.defaultCountryCode ?? "91"
  );

  if (!validation.valid || !validation.normalizedPhone) {
    return {
      success: false,
      error: validation.error || "Invalid phone number.",
    };
  }

  try {
    const url = buildWhatsAppChatUrl(validation.normalizedPhone, message);
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    return {
      success: true,
      url,
      normalizedPhone: validation.normalizedPhone,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to generate WhatsApp URL.",
    };
  }
}
