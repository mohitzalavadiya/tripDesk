import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";

/**
 * Standard base class for all API domain and HTTP errors.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Authentication required to access this resource.", details?: any) {
    super(401, "UNAUTHORIZED", message, details);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "You do not have permission to perform this action.", details?: any) {
    super(403, "FORBIDDEN", message, details);
  }
}

export class ReadOnlyAccessError extends ApiError {
  constructor(
    message = "Your subscription has expired. Existing data is accessible in read-only mode, but modifications are restricted.",
    details?: any
  ) {
    super(403, "READ_ONLY_ACCESS", message, details);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = "Requested resource", details?: any) {
    super(404, "NOT_FOUND", `${resource} not found.`, details);
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Invalid request payload.", details?: any) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class ConflictError extends ApiError {
  constructor(message = "A resource with these details already exists.", details?: any) {
    super(409, "CONFLICT", message, details);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = "An unexpected server error occurred. Please try again.", details?: any) {
    super(500, "INTERNAL_ERROR", message, details);
  }
}

/**
 * Maps any error thrown during API execution into a standardized, sanitized JSON NextResponse.
 * Strictly prevents database connection strings, passwords, or Prisma stack traces from leaking.
 */
export function handleApiError(error: unknown): NextResponse {
  // 1. Domain ApiError (class instance or duck-typed descriptor)
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.statusCode }
    );
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as any).statusCode === "number"
  ) {
    const errObj = error as { statusCode: number; code?: string; message?: string; details?: any };
    return NextResponse.json(
      {
        success: false,
        error: {
          code: errObj.code || "API_ERROR",
          message: errObj.message || "An error occurred.",
          ...(errObj.details ? { details: errObj.details } : {}),
        },
      },
      { status: errObj.statusCode }
    );
  }

  // 2. Zod Schema Validation Error
  if (error instanceof ZodError) {
    const formattedIssues = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed. Please check the provided data.",
          details: formattedIssues,
        },
      },
      { status: 400 }
    );
  }

  // 3. Known Prisma Database Errors (Sanitized)
  if (typeof error === "object" && error !== null && "code" in error) {
    const prismaError = error as { code: string; meta?: any };

    // P2002: Unique constraint failed
    if (prismaError.code === "P2002") {
      const target = prismaError.meta?.target || "field";
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFLICT",
            message: `A record with this ${Array.isArray(target) ? target.join(", ") : target} already exists.`,
          },
        },
        { status: 409 }
      );
    }

    // P2025: Record not found
    if (prismaError.code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "The requested record was not found or has been removed.",
          },
        },
        { status: 404 }
      );
    }
  }

  // 4. Unexpected / Unknown Server Error (Safe fallback)
  logger.error("Unhandled Internal API Error", error);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while processing your request. Please try again later.",
      },
    },
    { status: 500 }
  );
}
