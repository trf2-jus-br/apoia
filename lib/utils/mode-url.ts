// Transformação de URLs de acordo com o modo de operação (JUDICIAL/ADMINISTRATIVO).
// Módulo puro (sem 'use client' nem 'server-only'): usado pelo hook client
// useModeUrl, pelos helpers server modeUrl/getModeUrl (lib/utils/prefs.ts) e
// por qualquer código que tenha um pathname/prefixo em mãos.
//
// Centralizar aqui a regra permite evoluir a estratégia (hoje: prefixo "/adm",
// ver proxy.ts) sem tocar nos call sites.

export const ADM_MODE_PREFIX = '/adm'

// Deriva o prefixo de modo a partir de um pathname (ex.: vindo de usePathname).
export function modeFromPathname(pathname: string | null | undefined): string {
    return pathname === ADM_MODE_PREFIX || pathname?.startsWith(ADM_MODE_PREFIX + '/') ? 'ADMINISTRATIVO' : 'JUDICIAL'
}

// Aplica o prefixo de modo a uma URL, com idempotência:
// - '' como prefixo (JUDICIAL): retorna a URL inalterada;
// - URLs já prefixadas, externas ou em formato desconhecido: inalteradas;
// - root-relative ('/path?query'): recebe o prefixo ('/adm/path?query');
// - absolutas same-origin ('http://host/path'): prefixo aplicado ao pathname.
export function applyModeToUrl(url: string, mode: string): string {
    const modePrefix = mode === 'ADMINISTRATIVO' ? ADM_MODE_PREFIX : ''
    if (!url || !modePrefix) return url
    if (url === modePrefix || url.startsWith(modePrefix + '/')) return url
    if (url.startsWith('/')) return `${modePrefix}${url}`
    try {
        const u = new URL(url)
        if (typeof window !== 'undefined' && u.origin === window.location.origin
            && u.pathname !== modePrefix && !u.pathname.startsWith(modePrefix + '/')) {
            u.pathname = modePrefix + u.pathname
            return u.toString()
        }
    } catch { /* não é uma URL absoluta: cai no retorno inalterado */ }
    return url
}

// Versão curried a partir de um pathname: devolve a função (url) => url com modo.
export function modeUrlFromPathname(pathname: string | null | undefined): (url: string) => string {
    const mode = modeFromPathname(pathname)
    return (url: string) => applyModeToUrl(url, mode)
}
