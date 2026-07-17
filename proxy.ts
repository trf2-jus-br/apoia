import { NextRequest, NextResponse } from 'next/server'

// Modo de operação via URL: o prefixo "/adm" indica modo ADMINISTRATIVO; a
// ausência do prefixo indica JUDICIAL (sempre). O rewrite é interno — a árvore
// de rotas não conhece o prefixo — e o modo é comunicado ao servidor pelo
// request header "x-apoia-mode", lido por getMode() em lib/utils/prefs.ts.
// Em URLs sem prefixo o header é removido para evitar spoofing pelo cliente.

const ADM_PREFIX = '/adm'
const MODE_HEADER = 'x-apoia-mode'

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    const requestHeaders = new Headers(request.headers)

    if (pathname === ADM_PREFIX || pathname.startsWith(ADM_PREFIX + '/')) {
        requestHeaders.set(MODE_HEADER, 'ADMINISTRATIVO')
        const stripped = pathname.slice(ADM_PREFIX.length) || '/'
        const url = request.nextUrl.clone()
        url.pathname = stripped
        return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    }

    requestHeaders.delete(MODE_HEADER)
    return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|logos/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|map|txt)).*)'],
}
