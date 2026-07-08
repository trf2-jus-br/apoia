import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { logHttpEvent } from './telemetry';

/**
 * A standardized error response format for the API.
 * @param message The error message.
 * @param status The HTTP status code.
 * @param stack Optional stack trace to include in the response body.
 * @param trace Optional array of completed step labels for debugging.
 * @returns A NextResponse object with a standardized error body.
 */
export function apiErrorResponse(message: string, status: number, stack?: string, trace?: string[]) {
    return NextResponse.json({
        errormsg: message,
        ...(stack ? { stack } : {}),
        ...(trace?.length ? { trace } : {}),
    }, { status });
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

/**
 * Helper para rastrear progresso de execucao dentro de um handler.
 * Cada chamada a step() registra um checkpoint.
 * Em caso de erro, a lista de steps completados e incluida na resposta.
 */
export class Trace {
    public steps: string[] = []
    step(label: string) {
        this.steps.push(label)
    }
}

// A type for API handlers to ensure consistency.
// Note: 'props' is 'any' to accommodate different route parameter structures.
type ApiHandler = (req: NextRequest, props: any) => Promise<NextResponse>;
type TracedApiHandler = (req: NextRequest, props: any, trace: Trace) => Promise<NextResponse>;

/**
 * A higher-order function to wrap API route handlers with standardized error handling.
 * @param handler The API route handler function to wrap.
 * @returns A new handler function with built-in try-catch logic.
 */
export function withErrorHandler(handler: ApiHandler | TracedApiHandler): ApiHandler {
    return async (req: NextRequest, props: any) => {
        const trace = new Trace()
        // Telemetria HTTP: loga start ao entrar e end ao concluir (inclusive em erro).
        // A request que causar indisponibilidade terá start sem end antes do buraco.
        const requestId = crypto.randomUUID().split('-')[0]
        const path = req.nextUrl?.pathname || req.url
        const method = req.method
        const start = Date.now()
        logHttpEvent('http:start', requestId, { method, path, has_body: !!req.body })
        let status = 200
        try {
            const res = await (handler as TracedApiHandler)(req, props, trace);
            status = res.status
            return res;
        } catch (error: any) {
            status = error.status || 500
            // Capture without fixed route tag; request URL already present in scope
            Sentry.captureException(error);

            // if (error instanceof ApiError) {
            return apiErrorResponse(error.message, error.status || 500, error.stack, trace.steps);
            // }
            // console.error('Unexpected API error:', error);
            // return apiErrorResponse('Internal server error', 500);
        } finally {
            logHttpEvent('http:end', requestId, {
                method,
                path,
                status,
                duration_ms: Date.now() - start,
            })
        }
    };
}
