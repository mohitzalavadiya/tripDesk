import {
  PHONE_REGEX,
  LOCKED_GST_RATES,
  isValidPhoneNumber,
  isValidInteger,
  isValidDecimal,
  isLockedGstRate,
} from "../src/lib/validation/field-validators";
import {
  phoneYup,
  integerYup,
  moneyYup,
  percentageYup,
  customerSchema,
  supplierSchema,
  hotelSchema,
  hotelRateSchema,
  vehicleSchema,
  vehicleRateSchema,
  pricingSettingsSchema,
} from "../src/lib/validation-schemas";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "../src/lib/validation/customer-schema";
import {
  createHotelSchema,
  updateHotelSchema,
} from "../src/lib/validation/hotel-schema";
import {
  createSupplierSchema,
  updateSupplierSchema,
} from "../src/lib/validation/supplier-schema";
import {
  createTripVehicleSchema,
  updateTripVehicleSchema,
} from "../src/lib/validation/trip-vehicle-schema";
import {
  createVehicleDispatchSchema,
  updateVehicleDispatchSchema,
  logCommunicationSchema,
} from "../src/lib/validation/operations-schema";
import { updateAgencyTaxProfileSchema } from "../src/lib/validation/tax-schema";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
  }
}

async function runAuditTests() {
  console.log("================================================================================");
  console.log("TRIPDESK — PROJECT-WIDE NUMERIC INPUT & FIELD INTEGRITY AUTOMATED TEST SUITE");
  console.log("================================================================================\n");

  // -------------------------------------------------------------------------
  // 1. Phone Number Validator Tests
  // -------------------------------------------------------------------------
  console.log("1. Testing Phone Number Validation (isValidPhoneNumber):");
  assert(isValidPhoneNumber("+91 98765 43210"), "Standard Indian mobile with country code");
  assert(isValidPhoneNumber("9876543210"), "10-digit mobile number");
  assert(isValidPhoneNumber("022-12345678"), "Landline with leading zero and hyphen preserved");
  assert(isValidPhoneNumber("(022) 12345678"), "Landline with parentheses preserved");
  assert(isValidPhoneNumber("(98765) 43210"), "Phone with balanced parentheses '(98765) 43210'");
  assert(isValidPhoneNumber("+1 (555) 123-4567"), "International format with parens and dashes");
  assert(isValidPhoneNumber("00919876543210"), "International format with leading 00");

  assert(!isValidPhoneNumber("(9876543210"), "Reject unclosed open parenthesis '(9876543210'");
  assert(!isValidPhoneNumber("98765)43210"), "Reject unopened close parenthesis '98765)43210'");
  assert(!isValidPhoneNumber("((9876543210))"), "Reject nested/multiple parentheses '((9876543210))'");
  assert(!isValidPhoneNumber("++919876543210"), "Reject duplicate plus prefix '++919876543210'");
  assert(!isValidPhoneNumber("91+9876543210"), "Reject misplaced plus '91+9876543210'");
  assert(!isValidPhoneNumber("()9876543210"), "Reject empty parentheses '()9876543210'");
  assert(!isValidPhoneNumber("9876543210a"), "Reject embedded alphabetic character");
  assert(!isValidPhoneNumber("abc"), "Reject purely alphabetic string 'abc'");
  assert(!isValidPhoneNumber("98765abcde"), "Reject mixed alphanumeric string");
  assert(!isValidPhoneNumber("1e5"), "Reject scientific notation '1e5'");
  assert(!isValidPhoneNumber("+91 98765 4321e"), "Reject scientific notation in phone prefix");
  assert(!isValidPhoneNumber("12345"), "Reject phone number under 7 digits");
  assert(!isValidPhoneNumber("12345678901234567"), "Reject phone number over 15 digits");
  assert(!isValidPhoneNumber("+91 98765@43210"), "Reject illegal symbol '@'");
  assert(!isValidPhoneNumber(""), "Reject empty string");

  // -------------------------------------------------------------------------
  // 2. Whole-Number (Integer) Validator Tests
  // -------------------------------------------------------------------------
  console.log("\n2. Testing Whole-Number Validation (isValidInteger):");
  assert(isValidInteger(1, { min: 1 }), "Valid number 1");
  assert(isValidInteger("5", { min: 1 }), "Valid numeric string '5'");
  assert(isValidInteger("100", { min: 0, max: 100 }), "Valid boundary string '100'");
  assert(isValidInteger(0, { min: 0 }), "Valid non-negative integer 0");

  assert(!isValidInteger("abc"), "Reject alphabetic 'abc'");
  assert(!isValidInteger("12abc"), "Reject mixed string '12abc'");
  assert(!isValidInteger("1.5"), "Reject decimal '1.5' in whole-number field");
  assert(!isValidInteger("0.5"), "Reject decimal '0.5' in whole-number field");
  assert(!isValidInteger("1e5"), "Reject scientific notation '1e5'");
  assert(!isValidInteger(-1, { min: 0 }), "Reject negative value -1");
  assert(!isValidInteger(101, { min: 0, max: 100 }), "Reject out-of-range value 101");
  assert(!isValidInteger(""), "Reject empty string");

  // -------------------------------------------------------------------------
  // 3. Monetary & Decimal Validator Tests
  // -------------------------------------------------------------------------
  console.log("\n3. Testing Decimal/Monetary Validation (isValidDecimal):");
  assert(isValidDecimal(100), "Valid number 100");
  assert(isValidDecimal("100.5"), "Valid decimal '100.5'");
  assert(isValidDecimal("12345.67"), "Valid monetary amount '12345.67'");
  assert(isValidDecimal(0, { min: 0 }), "Valid zero amount");

  assert(!isValidDecimal("abc"), "Reject alphabetic 'abc'");
  assert(!isValidDecimal("100abc"), "Reject mixed string '100abc'");
  assert(!isValidDecimal("1e5"), "Reject scientific notation '1e5'");
  assert(!isValidDecimal("12.34.56"), "Reject multiple decimal points '12.34.56'");
  assert(!isValidDecimal(-50, { min: 0 }), "Reject negative amount -50 when min=0");
  assert(!isValidDecimal(""), "Reject empty string");

  // -------------------------------------------------------------------------
  // 4. Locked GST Rates Tests
  // -------------------------------------------------------------------------
  console.log("\n4. Testing Locked GST Rates (isLockedGstRate):");
  assert(isLockedGstRate(0), "Locked slab 0% is allowed");
  assert(isLockedGstRate(5), "Locked slab 5% is allowed");
  assert(isLockedGstRate(12), "Locked slab 12% is allowed");
  assert(isLockedGstRate(18), "Locked slab 18% is allowed");
  assert(isLockedGstRate(28), "Locked slab 28% is allowed");

  assert(!isLockedGstRate(7), "Reject non-standard GST rate 7%");
  assert(!isLockedGstRate(15), "Reject non-standard GST rate 15%");
  assert(!isLockedGstRate(-5), "Reject negative tax rate -5%");
  assert(!isLockedGstRate("1e5"), "Reject scientific notation in tax rate");

  // -------------------------------------------------------------------------
  // 5. Shared Yup Schema Integration & Direct Raw String Input Tests
  // -------------------------------------------------------------------------
  console.log("\n5. Testing Shared Yup Schemas & Direct Raw String Inputs:");

  // 5.1 Direct integerYup Raw String & Number Tests
  const testIntReq = integerYup({ min: 1, max: 100, required: true, label: "Adults" });
  const testIntOpt = integerYup({ min: 0, max: 100, required: false, label: "Children" });

  assert(!testIntReq.isValidSync("1e5"), "integerYup rejects raw string '1e5'");
  assert(!testIntReq.isValidSync("100abc"), "integerYup rejects raw string '100abc'");
  assert(!testIntReq.isValidSync("1.5"), "integerYup rejects decimal string '1.5'");
  assert(!testIntReq.isValidSync("12.34.56"), "integerYup rejects multiple dots '12.34.56'");
  assert(!testIntReq.isValidSync("NaN"), "integerYup rejects string 'NaN'");
  assert(!testIntReq.isValidSync("Infinity"), "integerYup rejects string 'Infinity'");
  assert(!testIntReq.isValidSync(""), "Required integerYup rejects empty string ''");
  assert(!testIntReq.isValidSync(0), "integerYup rejects 0 when min=1");
  assert(testIntReq.isValidSync("5"), "integerYup accepts valid numeric string '5'");
  assert(testIntReq.isValidSync(5), "integerYup accepts valid number 5");

  assert(testIntOpt.isValidSync(""), "Optional integerYup accepts empty string ''");
  assert(testIntOpt.isValidSync(undefined), "Optional integerYup accepts undefined");
  assert(testIntOpt.validateSync("") === undefined, "Optional integerYup turns empty string into undefined (not 0)");
  assert(testIntOpt.isValidSync("0"), "Optional integerYup accepts string '0' when min=0");

  // 5.2 Direct moneyYup Raw String & Number Tests
  const testMoneyReq = moneyYup({ min: 0.01, max: 1000000, required: true, label: "Amount" });
  const testMoneyOpt = moneyYup({ min: 0, required: false, label: "Discount" });

  assert(!testMoneyReq.isValidSync("1e5"), "moneyYup rejects raw string '1e5'");
  assert(!testMoneyReq.isValidSync("100abc"), "moneyYup rejects raw string '100abc'");
  assert(!testMoneyReq.isValidSync("12.34.56"), "moneyYup rejects multiple dots '12.34.56'");
  assert(!testMoneyReq.isValidSync("NaN"), "moneyYup rejects string 'NaN'");
  assert(!testMoneyReq.isValidSync("Infinity"), "moneyYup rejects string 'Infinity'");
  assert(!testMoneyReq.isValidSync(""), "Required moneyYup rejects empty string ''");
  assert(!testMoneyReq.isValidSync("-50"), "moneyYup rejects negative amount '-50'");
  assert(testMoneyReq.isValidSync("1234.56"), "moneyYup accepts valid decimal string '1234.56'");
  assert(testMoneyReq.isValidSync(1234.56), "moneyYup accepts valid decimal number 1234.56");

  assert(testMoneyOpt.isValidSync(""), "Optional moneyYup accepts empty string ''");
  assert(testMoneyOpt.isValidSync(undefined), "Optional moneyYup accepts undefined");
  assert(testMoneyOpt.validateSync("") === undefined, "Optional moneyYup turns empty string into undefined (not 0)");
  assert(testMoneyOpt.isValidSync("0"), "Optional moneyYup accepts string '0'");
  assert(testMoneyOpt.isValidSync(0), "Optional moneyYup accepts number 0");

  // 5.3 Direct percentageYup Raw String & Number Tests
  const testPctReq = percentageYup({ min: 0, max: 100, required: true, label: "Tax" });
  const testPctOpt = percentageYup({ min: 0, max: 100, required: false, label: "Margin" });

  assert(!testPctReq.isValidSync("1e5"), "percentageYup rejects raw string '1e5'");
  assert(!testPctReq.isValidSync("2e1"), "percentageYup rejects raw string '2e1'");
  assert(!testPctReq.isValidSync("18abc"), "percentageYup rejects raw string '18abc'");
  assert(!testPctReq.isValidSync("18.5.5"), "percentageYup rejects malformed decimal '18.5.5'");
  assert(!testPctReq.isValidSync("105"), "percentageYup rejects string '105' exceeding 100%");
  assert(!testPctReq.isValidSync("-1"), "percentageYup rejects string '-1' below 0%");
  assert(testPctReq.isValidSync("18"), "percentageYup accepts valid percentage string '18'");
  assert(testPctReq.isValidSync("12.5"), "percentageYup accepts valid decimal percentage '12.5'");
  assert(testPctReq.isValidSync(18), "percentageYup accepts valid number 18");

  assert(testPctOpt.isValidSync(""), "Optional percentageYup accepts empty string ''");
  assert(testPctOpt.isValidSync(undefined), "Optional percentageYup accepts undefined");
  assert(testPctOpt.validateSync("") === undefined, "Optional percentageYup turns empty string into undefined (not 0)");

  // 5.4 Direct phoneYup Raw String Tests
  const testPhoneReq = phoneYup(true, "Mobile");
  const testPhoneOpt = phoneYup(false, "Alternate");

  assert(testPhoneReq.isValidSync("9876543210"), "phoneYup accepts 10-digit mobile");
  assert(testPhoneReq.isValidSync("+91 98765 43210"), "phoneYup accepts international format");
  assert(testPhoneReq.isValidSync("(98765) 43210"), "phoneYup accepts balanced parentheses");
  assert(!testPhoneReq.isValidSync("(9876543210"), "phoneYup rejects unclosed parenthesis");
  assert(!testPhoneReq.isValidSync("98765)43210"), "phoneYup rejects unopened parenthesis");
  assert(!testPhoneReq.isValidSync("((9876543210))"), "phoneYup rejects duplicate parentheses");
  assert(!testPhoneReq.isValidSync("++919876543210"), "phoneYup rejects duplicate plus");
  assert(!testPhoneReq.isValidSync("1e5"), "phoneYup rejects '1e5'");
  assert(!testPhoneReq.isValidSync(""), "Required phoneYup rejects empty string ''");
  assert(testPhoneOpt.isValidSync(""), "Optional phoneYup accepts empty string ''");
  assert(testPhoneOpt.isValidSync(undefined), "Optional phoneYup accepts undefined");

  // 5.5 Formik Schema Integration Tests
  // Customer Schema Phone Tests
  const validCustomer = {
    name: "Mohit Travel Co",
    email: "mohit@example.com",
    phone: "+91 98765 43210",
  };
  assert(customerSchema.isValidSync(validCustomer), "Valid customer passes Yup schema");

  const customerWithInvalidPhone = {
    ...validCustomer,
    phone: "abc-phone",
  };
  assert(!customerSchema.isValidSync(customerWithInvalidPhone), "Customer with 'abc-phone' is rejected by Yup");

  const customerWithScientificPhone = {
    ...validCustomer,
    phone: "1e5",
  };
  assert(!customerSchema.isValidSync(customerWithScientificPhone), "Customer with '1e5' phone is rejected by Yup");

  const customerWithUnbalancedPhone = {
    ...validCustomer,
    phone: "(9876543210",
  };
  assert(!customerSchema.isValidSync(customerWithUnbalancedPhone), "Customer with unbalanced phone is rejected by Yup");

  // Hotel Rate Schema Numeric Tests
  const validHotelRate = {
    hotelId: "clhotel123456",
    roomId: "clroom123456",
    roomType: "Deluxe",
    mealPlan: "CP",
    baseRate: 4500,
    occupancyAdults: 2,
    occupancyChildren: 1,
    extraAdultRate: 1500,
    childRate: 800,
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
  };
  assert(hotelRateSchema.isValidSync(validHotelRate), "Valid hotel rate passes Yup schema");

  const hotelRateWithDecOccupancy = {
    ...validHotelRate,
    occupancyAdults: 2.5,
  };
  assert(!hotelRateSchema.isValidSync(hotelRateWithDecOccupancy), "Hotel rate with 2.5 occupancyAdults rejected by Yup");

  const hotelRateWithLetterRate = {
    ...validHotelRate,
    baseRate: "4500abc",
  };
  assert(!hotelRateSchema.isValidSync(hotelRateWithLetterRate), "Hotel rate with '4500abc' baseRate rejected by Yup");

  const hotelRateWithSciRate = {
    ...validHotelRate,
    baseRate: "1e5",
  };
  assert(!hotelRateSchema.isValidSync(hotelRateWithSciRate), "Hotel rate with '1e5' baseRate rejected by Yup");

  // Pricing Settings Schema Tests
  const validPricing = {
    markupType: "percentage",
    markupValue: 15,
    discountType: "percentage",
    discountValue: 5,
    pricingMode: "automatic",
    customTaxRate: 18,
    roundPriceTo: 10,
  };
  assert(pricingSettingsSchema.isValidSync(validPricing), "Valid pricing settings pass Yup schema");

  const pricingWithInvalidTax = {
    ...validPricing,
    customTaxRate: 105, // Exceeds 100% max!
  };
  assert(!pricingSettingsSchema.isValidSync(pricingWithInvalidTax), "Pricing settings with invalid tax rate (105%) rejected by Yup");

  const pricingWithSciTax = {
    ...validPricing,
    customTaxRate: "1e5",
  };
  assert(!pricingSettingsSchema.isValidSync(pricingWithSciTax), "Pricing settings with '1e5' tax rate rejected by Yup");

  // -------------------------------------------------------------------------
  // 6. Backend Zod Schemas Integration Tests
  // -------------------------------------------------------------------------
  console.log("\n6. Testing Backend Zod Schemas:");

  // createCustomerSchema
  const zodCustomerValid = createCustomerSchema.safeParse({
    name: "Amit Sharma",
    phone: "+91 98765 43210",
  });
  assert(zodCustomerValid.success, "Valid customer payload passes Zod createCustomerSchema");

  const zodCustomerLetters = createCustomerSchema.safeParse({
    name: "Amit Sharma",
    phone: "invalidphone",
  });
  assert(!zodCustomerLetters.success, "Zod createCustomerSchema rejects alphabetic phone 'invalidphone'");

  const zodCustomerSci = createCustomerSchema.safeParse({
    name: "Amit Sharma",
    phone: "1e5",
  });
  assert(!zodCustomerSci.success, "Zod createCustomerSchema rejects scientific notation phone '1e5'");

  // updateAgencyTaxProfileSchema
  const zodTaxValid = updateAgencyTaxProfileSchema.safeParse({
    defaultGstRate: 18,
  });
  assert(zodTaxValid.success, "Zod tax profile schema accepts locked 18% GST");

  const zodTaxArbitrary = updateAgencyTaxProfileSchema.safeParse({
    defaultGstRate: 13,
  });
  assert(!zodTaxArbitrary.success, "Zod tax profile schema rejects arbitrary 13% GST rate");

  // createVehicleDispatchSchema
  const zodDispatchValid = createVehicleDispatchSchema.safeParse({
    tripVehicleId: "cm1234567890",
    driverName: "Ramesh Driver",
    driverPhone: "+91 98765 12345",
  });
  assert(zodDispatchValid.success, "Valid vehicle dispatch passes Zod schema");

  const zodDispatchInvalidPhone = createVehicleDispatchSchema.safeParse({
    tripVehicleId: "cm1234567890",
    driverName: "Ramesh Driver",
    driverPhone: "bad-phone-no",
  });
  assert(!zodDispatchInvalidPhone.success, "Vehicle dispatch with 'bad-phone-no' rejected by Zod schema");

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`AUDIT TEST SUMMARY: Total: ${passedCount + failedCount} | Passed: ${passedCount} | Failed: ${failedCount}`);
  console.log("================================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAuditTests().catch((err) => {
  console.error("Test execution failed with unhandled error:", err);
  process.exit(1);
});
