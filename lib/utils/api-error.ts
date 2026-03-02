import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

/**
 * A standardized error response format for the API.
 * @param message The error message.
 * @param status The HTTP status code.
 * @param stack Optional stack trace to include in the response body.
 * @returns A NextResponse object with a standardized error body.
 */
export function apiErrorResponse(message: string, status: number, stack?: string) {
    return NextResponse.json({ errormsg: message, ...(stack ? { stack } : {}) }, { status });
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

/**
 * Error que não será enviado para o Sentry.
 * Use para erros esperados/controlados que não requerem alertas.
 */
export class SilentError extends ApiError {
    public readonly skipSentry = true;
    
    constructor(message: string, status: number) {
        super(message, status);
    }
}

export class CannotAccessProcessMetadataError extends SilentError {
    constructor(message: string = 'Cannot access process metadata') {
        super(message, 500);
    }
}

export class CannotAccessPieceTextError extends SilentError {
    constructor(message: string = 'Cannot access piece text') {
        super(message, 500);
    }
}

export class InvalidProcessNumberError extends SilentError {
    constructor(message: string = 'Invalid process number') {
        super(message, 400);
    }
}

export class InvalidPieceContentTypeError extends SilentError {
    constructor(message: string = 'Invalid piece content type') {
        super(message, 400);
    }
}

export class OutOfQuotaError extends SilentError {
    constructor(message: string = 'Out of quota') {
        super(message, 429);
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

            // if (error instanceof ApiError) {
            return apiErrorResponse(error.message, error.status || 500, error.stack);
            // }
            // console.error('Unexpected API error:', error);
            // return apiErrorResponse('Internal server error', 500);
        }
    };
}
