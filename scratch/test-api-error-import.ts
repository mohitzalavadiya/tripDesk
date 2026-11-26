import { ApiError } from "../src/lib/api/errors";

console.log("ApiError class:", ApiError);
const err = new ApiError(503, "MIGRATION_REQUIRED", "Testing migration required");
console.log("Instance:", err instanceof ApiError, err.statusCode, err.code, err.message);

