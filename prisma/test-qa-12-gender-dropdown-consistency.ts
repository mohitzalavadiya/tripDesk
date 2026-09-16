import "dotenv/config";
import { GENDER_OPTIONS, formatEnumLabel } from "../src/lib/utils/enum-formatters";
import { createTravelerSchema, updateTravelerSchema } from "../src/lib/validation/traveler-schema";
import { createCustomerSchema, updateCustomerSchema } from "../src/lib/validation/customer-schema";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runGenderConsistencyTests() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING GLOBAL GENDER DROPDOWN CONSISTENCY TEST SUITE");
  console.log("══════════════════════════════════════════════════════════════\n");

  console.log("1. Canonical GENDER_OPTIONS Validation");
  assert(Array.isArray(GENDER_OPTIONS), "GENDER_OPTIONS is exported as an array");
  assert(GENDER_OPTIONS.length === 3, `GENDER_OPTIONS has exactly 3 options (got ${GENDER_OPTIONS.length})`);
  
  const values = GENDER_OPTIONS.map((o) => o.value);
  assert(values.includes("Male"), "GENDER_OPTIONS includes 'Male'");
  assert(values.includes("Female"), "GENDER_OPTIONS includes 'Female'");
  assert(values.includes("Other"), "GENDER_OPTIONS includes 'Other'");

  const labels = GENDER_OPTIONS.map((o) => o.label);
  assert(labels.includes("Male"), "Labels include 'Male'");
  assert(labels.includes("Female"), "Labels include 'Female'");
  assert(labels.includes("Other"), "Labels include 'Other'");

  console.log("\n2. formatEnumLabel Demographic Formatting");
  assert(formatEnumLabel("Male") === "Male", "formatEnumLabel('Male') returns 'Male'");
  assert(formatEnumLabel("Female") === "Female", "formatEnumLabel('Female') returns 'Female'");
  assert(formatEnumLabel("Other") === "Other", "formatEnumLabel('Other') returns 'Other'");
  assert(formatEnumLabel("MALE") === "Male", "formatEnumLabel('MALE') returns 'Male'");
  assert(formatEnumLabel("FEMALE") === "Female", "formatEnumLabel('FEMALE') returns 'Female'");
  assert(formatEnumLabel("OTHER") === "Other", "formatEnumLabel('OTHER') returns 'Other'");
  assert(formatEnumLabel("male") === "Male", "formatEnumLabel('male') returns 'Male'");
  assert(formatEnumLabel("female") === "Female", "formatEnumLabel('female') returns 'Female'");
  assert(formatEnumLabel("other") === "Other", "formatEnumLabel('other') returns 'Other'");

  console.log("\n3. Traveler Schema Validation with Gender");
  const validTraveler1 = createTravelerSchema.parse({
    name: "John Doe",
    type: "ADULT",
    gender: "Male",
  });
  assert(validTraveler1.gender === "Male", "createTravelerSchema accepts 'Male'");

  const validTraveler2 = createTravelerSchema.parse({
    name: "Jane Doe",
    type: "ADULT",
    gender: "Female",
  });
  assert(validTraveler2.gender === "Female", "createTravelerSchema accepts 'Female'");

  const validTraveler3 = createTravelerSchema.parse({
    name: "Alex Doe",
    type: "ADULT",
    gender: "Other",
  });
  assert(validTraveler3.gender === "Other", "createTravelerSchema accepts 'Other'");

  const validTravelerOptional = createTravelerSchema.parse({
    name: "Sam Doe",
    type: "ADULT",
    gender: "",
  });
  assert(validTravelerOptional.gender === "", "createTravelerSchema accepts empty string (optional)");

  const validTravelerNull = createTravelerSchema.parse({
    name: "Sam Doe",
    type: "ADULT",
    gender: null,
  });
  assert(validTravelerNull.gender === null, "createTravelerSchema accepts null (optional)");

  const updateTravelerValid = updateTravelerSchema.parse({
    gender: "Female",
  });
  assert(updateTravelerValid.gender === "Female", "updateTravelerSchema accepts 'Female'");

  console.log("\n4. Customer Schema Validation with Gender");
  const validCustomer1 = createCustomerSchema.parse({
    name: "Alice Smith",
    phone: "+919876543210",
    gender: "Female",
  });
  assert(validCustomer1.gender === "Female", "createCustomerSchema accepts 'Female'");

  const validCustomer2 = createCustomerSchema.parse({
    name: "Bob Smith",
    phone: "+919876543210",
    gender: "Male",
  });
  assert(validCustomer2.gender === "Male", "createCustomerSchema accepts 'Male'");

  const validCustomerOptional = createCustomerSchema.parse({
    name: "Charlie Smith",
    phone: "+919876543210",
  });
  assert(validCustomerOptional.gender === undefined || validCustomerOptional.gender === null, "createCustomerSchema allows omitting optional gender");

  const updateCustomerValid = updateCustomerSchema.parse({
    gender: "Other",
  });
  assert(updateCustomerValid.gender === "Other", "updateCustomerSchema accepts 'Other'");

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("🎯 ALL GLOBAL GENDER DROPDOWN CONSISTENCY TESTS PASSED (100%)");
  console.log("══════════════════════════════════════════════════════════════\n");
}

runGenderConsistencyTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
