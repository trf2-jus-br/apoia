'use client'

import { usePathname } from 'next/navigation'

// Retorna '/adm' quando a URL corrente está sob o prefixo de modo administrativo
// (ver proxy.ts), senão ''. Usar para montar hrefs e URLs de fetch em client
// components que precisam manter o modo durante a navegação/chamadas de API.
export function useModePrefix(): string {
    const pathname = usePathname()
    return pathname === '/adm' || pathname.startsWith('/adm/') ? '/adm' : ''
}
