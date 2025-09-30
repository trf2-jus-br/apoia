import { redirect } from 'next/navigation'

// Shape of the user object we rely on (partial to avoid tight coupling)
// Extend the domain UserType with an optional legacy `picture` object used in some
// session payloads (original JS code referenced user.picture.*). We fallback to
// top-level fields when `picture` is absent.
interface LegacyPictureFields { email?: string; name?: string; cpf?: string }

interface FetcherErrorPayload {
    errormsg?: string
    error?: {
        err?: { message?: string } | string | null
        message?: string
    }
}

interface FetchParams {
    headers?: Record<string, string>
    setErrorMessage?: (msg: string) => void
    // Allow any other ad-hoc properties without type errors
    [key: string]: any
}

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    redirect?: boolean
}

// Union return type helper for blob / json responses.
export type JsonOrBlob<T> = T | Blob

// Narrow response type util
function isJsonResponse(res: Response) {
    const ct = res.headers.get('content-type')
    return !!ct && ct.includes('application/json')
}

// Extract standard API error message heuristics
function extractErrorMessage(data: FetcherErrorPayload | undefined | null): string {
    if (!data) return 'Indisponibilidade de sistema.'
    if (data.errormsg) return data.errormsg
    if (data.error) {
        const e = data.error
        if (typeof e.err === 'object' && e.err !== null && 'message' in e.err && e.err.message) return e.err.message as string
        if (typeof e.err === 'string' && e.err) return e.err
        if (e.message) return e.message
    }
    return 'Indisponibilidade de sistema.'
}

// Build absolute URL on server for relative paths
function resolveFullUrl(url: string): string {
    if (typeof window !== 'undefined') return url
    if (!url.startsWith('/')) return url
    const base = process.env.NEXT_PUBLIC_BASE_URL
    return `${base}${url}`
}

async function appendServerCookies(headers: Record<string, string>): Promise<Record<string, string>> {
    if (typeof window !== 'undefined') return headers
    try {
        const mod = await import('next/headers')
        const cookieStore = await mod.cookies()
        const all = await cookieStore.getAll()
        const nextauth = await cookieStore.get('next-auth.session-token')
        let secureNextauth: any = await cookieStore.get('__Secure-next-auth.session-token')
        if (!secureNextauth && nextauth)
            // build a minimal cookie-like object instead of using an undefined Cookie constructor
            secureNextauth = { name: '__Secure-next-auth.session-token', value: nextauth.value, secure: true }
        const cookieHeader = [nextauth, secureNextauth].filter(c => !!c).map(c => `${c.name}=${c.value}`).join('; ')
        if (nextauth) headers = { ...headers, cookie: cookieHeader }
    } catch {
        // ignore
    }
    return headers
}

const fetcherUtil = {
    // Simple passthrough fetcher (kept for compatibility)
    fetcher: (...args: Parameters<typeof fetch>) => fetch(...args).then(res => res.json()),

    async get<T = unknown>(url: string, params?: FetchParams, options?: RequestOptions): Promise<JsonOrBlob<T>> {
        let errorMsg: string | undefined
        let status = 0
        let headers: Record<string, string> = {
            'Access-Control-Allow-Origin': '*'
        }

        const fullUrl = resolveFullUrl(url)

        if (params?.headers) headers = { ...headers, ...params.headers }

        if (url.startsWith('/api/'))
            headers = await appendServerCookies(headers)

        try {
            const res = await fetch(fullUrl, {
                method: 'GET',
                headers,
                cache: 'no-store'
            })
            status = res.status

            if (isJsonResponse(res)) {
                const data: T & FetcherErrorPayload = await res.json()
                if (res.status !== 200) {
                    errorMsg = extractErrorMessage(data as FetcherErrorPayload)
                }
                return data as T
            }

            return await res.blob()
        } catch (ex) {
            errorMsg = `Ocorreu uma indisponibilidade: ${String(ex)}: ${url}`
        } finally {
            if ((!options || options.redirect !== false) && status === 401) redirect('/auth/signin')
            if (errorMsg) {
                params?.setErrorMessage?.(errorMsg)
                throw new Error(errorMsg)
            }
        }
    },

    async post<TReq = unknown, TRes = unknown>(
        url: string,
        body?: TReq,
        params?: FetchParams,
        options?: RequestOptions
    ): Promise<any> {
        let errorMsg: string | undefined
        let status = 0
        let headers: Record<string, string> = {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        }

        const fullUrl = resolveFullUrl(url)

        if (params?.headers) headers = { ...headers, ...params.headers }

        if (url.startsWith('/api/'))
            headers = await appendServerCookies(headers)

        try {
            const res = await fetch(fullUrl, {
                method: options?.method || 'POST',
                body: body !== undefined ? JSON.stringify(body) : undefined,
                headers,
                cache: 'no-store'
            })
            status = res.status
            let data: TRes & FetcherErrorPayload | undefined

            try {
                data = (await res.json()) as TRes & FetcherErrorPayload
            } catch {
                // Non JSON response
            }

            if (res.status !== 200) {
                errorMsg = extractErrorMessage(data as FetcherErrorPayload)
            }
            return data as TRes
        } catch (ex) {
            errorMsg = `Ocorreu uma indisponibilidade: ${String(ex)}: ${url}`
        } finally {
            if ((!options || options.redirect !== false) && status === 401) redirect('/auth/signin')
            if (errorMsg) {
                params?.setErrorMessage?.(errorMsg)
                throw new Error(errorMsg)
            }
        }
        // Unreachable but needed for TS control flow
        return undefined as unknown as TRes
    },

    processError(error: unknown, setErrorMessage?: (msg: string) => void) {
        if (error && typeof error === 'object' && 'message' in error && (error as Error).message === 'NEXT_REDIRECT') throw error
        const message =
            typeof error === 'string'
                ? error
                : (error && typeof error === 'object' && 'message' in error && (error as Error).message) || 'Erro desconhecido'
        setErrorMessage?.(message)
        return message
    }
}

export default fetcherUtil
export type { FetchParams, RequestOptions }