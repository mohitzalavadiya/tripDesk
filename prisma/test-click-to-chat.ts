/**
 * Test Suite: WhatsApp Click-to-Chat Phone Normalization & URL Encoding
 */

import {
  validateAndNormalizeWhatsAppPhone,
  buildWhatsAppChatUrl,
  openWhatsAppChat,
} from "../src/lib/communication/whatsapp/click-to-chat";

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ""}`);
    failCount++;
  }
}

console.log("\n═════════════════════════════════════════════════════════════════════");
console.log("WHATSAPP CLICK-TO-CHAT UNIT TESTS");
console.log("═════════════════════════════════════════════════════════════════════\n");

// 1. Indian 10-digit mobile numbers
console.log("--- 1. Indian 10-digit Mobile Numbers ---");
{
  const res1 = validateAndNormalizeWhatsAppPhone("9876543210");
  assert(res1.valid && res1.normalizedPhone === "919876543210", "10-digit starting with 9 normalizes to 919876543210");

  const res2 = validateAndNormalizeWhatsAppPhone("8123456789");
  assert(res2.valid && res2.normalizedPhone === "918123456789", "10-digit starting with 8 normalizes to 918123456789");

  const res3 = validateAndNormalizeWhatsAppPhone("7000000000");
  assert(res3.valid && res3.normalizedPhone === "917000000000", "10-digit starting with 7 normalizes to 917000000000");

  const res4 = validateAndNormalizeWhatsAppPhone("6399999999");
  assert(res4.valid && res4.normalizedPhone === "916399999999", "10-digit starting with 6 normalizes to 916399999999");

  const res5 = validateAndNormalizeWhatsAppPhone("98765 43210");
  assert(res5.valid && res5.normalizedPhone === "919876543210", "10-digit with whitespace normalizes cleanly");

  const res6 = validateAndNormalizeWhatsAppPhone("9876-543-210");
  assert(res6.valid && res6.normalizedPhone === "919876543210", "10-digit with hyphens normalizes cleanly");
}

// 2. Numbers with +91 or 91 (Duplicate Country Code Prevention)
console.log("\n--- 2. Numbers with +91 or 91 (Duplicate Prevention) ---");
{
  const res1 = validateAndNormalizeWhatsAppPhone("+91 98765 43210");
  assert(res1.valid && res1.normalizedPhone === "919876543210", "+91 with spaces avoids duplicate country code");

  const res2 = validateAndNormalizeWhatsAppPhone("+919876543210");
  assert(res2.valid && res2.normalizedPhone === "919876543210", "+91 compact avoids duplicate country code");

  const res3 = validateAndNormalizeWhatsAppPhone("919876543210");
  assert(res3.valid && res3.normalizedPhone === "919876543210", "91 prefix avoids duplicate country code (not 9191...)");

  const res4 = validateAndNormalizeWhatsAppPhone("+91-98765-43210");
  assert(res4.valid && res4.normalizedPhone === "919876543210", "+91 with hyphens normalizes cleanly");
}

// 3. Indian Domestic Trunk Prefix (Leading 0)
console.log("\n--- 3. Leading Zero Trunk Prefix ---");
{
  const res1 = validateAndNormalizeWhatsAppPhone("09876543210");
  assert(res1.valid && res1.normalizedPhone === "919876543210", "09876543210 converts leading 0 to 91");

  const res2 = validateAndNormalizeWhatsAppPhone("07890123456");
  assert(res2.valid && res2.normalizedPhone === "917890123456", "07890123456 converts leading 0 to 91");
}

// 4. Valid International Numbers with '+'
console.log("\n--- 4. Valid International Numbers with '+' ---");
{
  const resUS = validateAndNormalizeWhatsAppPhone("+1 555 123 4567");
  assert(resUS.valid && resUS.normalizedPhone === "15551234567", "US number +1 555 123 4567 preserved without India 91 injection");

  const resUK = validateAndNormalizeWhatsAppPhone("+44 7911 123456");
  assert(resUK.valid && resUK.normalizedPhone === "447911123456", "UK number +44 7911 123456 preserved");

  const resUAE = validateAndNormalizeWhatsAppPhone("+971 50 123 4567");
  assert(resUAE.valid && resUAE.normalizedPhone === "971501234567", "UAE number +971 50 123 4567 preserved");
}

// 5. Missing, Malformed, and Ambiguous Numbers
console.log("\n--- 5. Missing, Malformed, and Ambiguous Numbers ---");
{
  const resEmpty = validateAndNormalizeWhatsAppPhone("");
  assert(!resEmpty.valid && !!resEmpty.error, "Empty string rejected with clear error");

  const resNull = validateAndNormalizeWhatsAppPhone(null);
  assert(!resNull.valid && !!resNull.error, "Null value rejected with clear error");

  const resUndefined = validateAndNormalizeWhatsAppPhone(undefined);
  assert(!resUndefined.valid && !!resUndefined.error, "Undefined rejected with clear error");

  const resShort = validateAndNormalizeWhatsAppPhone("12345");
  assert(!resShort.valid && !!resShort.error, "Short number rejected with error");

  const resNonIndian10 = validateAndNormalizeWhatsAppPhone("1234567890");
  assert(!resNonIndian10.valid && !!resNonIndian10.error, "10-digit not starting with 6-9 rejected for ambiguity without +");

  const resChars = validateAndNormalizeWhatsAppPhone("abcdefg");
  assert(!resChars.valid && !!resChars.error, "Alphabetic characters rejected");
}

// 6. WhatsApp URL Construction & Message Encoding
console.log("\n--- 6. WhatsApp URL Construction & Encoding ---");
{
  const urlNoMsg = buildWhatsAppChatUrl("9876543210");
  assert(urlNoMsg === "https://wa.me/919876543210", "URL without message returns plain wa.me/phone");

  const urlEmptyMsg = buildWhatsAppChatUrl("9876543210", "   ");
  assert(urlEmptyMsg === "https://wa.me/919876543210", "URL with whitespace message returns plain wa.me/phone");

  const complexMessage = "Hello Mohit! ✨\nYour quotation for Goa & Kerala: ₹25,000 (100% confirmed) & all-inclusive.";
  const urlWithMsg = buildWhatsAppChatUrl("9876543210", complexMessage);
  assert(urlWithMsg.startsWith("https://wa.me/919876543210?text="), "URL with message has ?text= query param");
  assert(urlWithMsg.includes(encodeURIComponent("Hello Mohit! ✨")), "Encodes emoji and greetings");
  assert(urlWithMsg.includes(encodeURIComponent("₹25,000")), "Encodes currency symbols and punctuation");
  assert(urlWithMsg.includes(encodeURIComponent("& all-inclusive")), "Encodes ampersands safely without breaking query string");
  assert(urlWithMsg.includes(encodeURIComponent("\n")), "Encodes newlines safely");
}

// 7. openWhatsAppChat Result Structure
console.log("\n--- 7. openWhatsAppChat Result Structure ---");
{
  const resValid = openWhatsAppChat("+91 98765 43210", "Test message");
  assert(resValid.success && resValid.normalizedPhone === "919876543210" && !!resValid.url, "openWhatsAppChat returns success, normalizedPhone, and url");

  const resInvalid = openWhatsAppChat("invalid");
  assert(!resInvalid.success && !!resInvalid.error, "openWhatsAppChat returns failure with error for invalid input");
}

console.log("\n═════════════════════════════════════════════════════════════════════");
console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log("═════════════════════════════════════════════════════════════════════\n");

if (failCount > 0) {
  process.exit(1);
}
