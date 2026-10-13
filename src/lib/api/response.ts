import { NextResponse } from "next/server";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  meta?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Creates a standard JSON success response.
 */
export function apiSuccess<T>(data: T, status = 200, meta?: Record<string, any>): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta ? { meta } : {}),
    },
    { status }
  );
}

/**
 * Creates a standard HTTP 201 Created JSON response.
 */
export function apiCreated<T>(data: T, meta?: Record<string, any>): NextResponse<ApiResponse<T>> {
  return apiSuccess(data, 201, meta);
}

/**
 * Creates a standard HTTP 204 No Content response.
 */
export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
