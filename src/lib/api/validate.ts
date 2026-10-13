import { z } from "zod";
import { ValidationError } from "./errors";

/**
 * Validates and parses a JSON request body using a Zod schema.
 * Throws ValidationError if JSON syntax is invalid or schema validation fails.
 */
export async function validateJson<T>(schema: z.ZodType<T>, request: Request): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (err) {
    throw new ValidationError("Malformed JSON in request body.");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw result.error;
  }

  return result.data;
}

/**
 * Validates and parses URL search query parameters using a Zod schema.
 */
export function validateQueryParams<T>(schema: z.ZodType<T>, searchParams: URLSearchParams): T {
  const queryObj: Record<string, string | string[]> = {};

  searchParams.forEach((value, key) => {
    if (queryObj[key]) {
      if (Array.isArray(queryObj[key])) {
        (queryObj[key] as string[]).push(value);
      } else {
        queryObj[key] = [queryObj[key] as string, value];
      }
    } else {
      queryObj[key] = value;
    }
  });

  const result = schema.safeParse(queryObj);
  if (!result.success) {
    throw result.error;
  }

  return result.data;
}

/**
 * Validates and parses route parameters (e.g., { id: string }) using a Zod schema.
 */
export function validateRouteParams<T>(schema: z.ZodType<T>, params: unknown): T {
  const result = schema.safeParse(params);
  if (!result.success) {
    throw result.error;
  }

  return result.data;
}
