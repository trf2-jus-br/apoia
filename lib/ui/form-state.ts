import { ZodError } from 'zod'

export type FormState = {
    status: 'UNSET' | 'SUCCESS' | 'ERROR'
    message: string
    fieldErrors: Record<string, string[] | undefined>
    timestamp: number
}

export const EMPTY_FORM_STATE: FormState = {
    status: 'UNSET' as const,
    message: '',
    fieldErrors: {},
    timestamp: Date.now(),
}

export const getPathReference = (path: (string | number)[]): string => {
    const segments = path.reduce((acc: string, segment, index) => {
        if (typeof segment === 'number') {
            return `${acc}[${segment}]`
        } else {
            return index === 0 ? `${segment}` : `${acc}.${segment}`
        }
    }, '');
    return segments as string;
}

export const fromErrorToFormState = (error: unknown) => {
    if (error instanceof ZodError) {
        const fieldErrors = error.errors.reduce((acc, e) => {
            if (!acc[getPathReference(e.path)])
                acc[getPathReference(e.path)] = [e.message]
            else
                acc[getPathReference(e.path)].push(e.message)
            return acc
        }, {})
        return {
            status: 'ERROR' as const,
            message: '',
            fieldErrors,
            timestamp: Date.now()
        }
    } else if (error instanceof Error) {
        return {
            status: 'ERROR' as const,
            message: error.message,
            fieldErrors: {},
            timestamp: Date.now(),
        }
    } else {
        return {
            status: 'ERROR' as const,
            message: 'An unknown error occurred',
            fieldErrors: {},
            timestamp: Date.now(),
        }
    }
}
