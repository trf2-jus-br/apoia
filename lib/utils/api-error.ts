import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

/**
 * A standardized error response format for the API.
 * @param message The error message.
 * @param status The HTTP status code.
 * @returns A NextResponse object with a standardized error body.
 */
export function apiErrorResponse(message: string, status: number) {
    return NextResponse.json({ errormsg: message }, { status });
}

/**
 * Base class for custom API errors.
 * Allows bundling a message and an HTTP status code together.
 */
export class ApiError extends Error {
    public readonly status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

export class NotFoundError extends ApiError {
    constructor(message: string = 'Resource not found') {
        super(message, 404);
    }
}

export class BadRequestError extends ApiError {
    constructor(message: string = 'Bad request') {
        super(message, 400);
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message: string = 'Unauthorized') {
        super(message, 401);
    }
}

export class ForbiddenError extends ApiError {
    constructor(message: string = 'Forbidden') {
        super(message, 403);
    }
}

// A type for API handlers to ensure consistency.
// Note: 'props' is 'any' to accommodate different route parameter structures.
type ApiHandler = (req: NextRequest, props: any) => Promise<NextResponse>;

/**
 * A higher-order function to wrap API route handlers with standardized error handling.
 * @param handler The API route handler function to wrap.
 * @returns A new handler function with built-in try-catch logic.
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
    return async (req: NextRequest, props: any) => {
        try {
            return await handler(req, props);
        } catch (error: any) {
            // Capture without fixed route tag; request URL already present in scope
            Sentry.captureException(error);

            if (error instanceof ApiError) {
                return apiErrorResponse(error.message, error.status);
            }
            console.error('Unexpected API error:', error);
            return apiErrorResponse('Internal server error', 500);
        }
    };
}
