'use client'

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { modeUrlFromPathname } from '@/lib/utils/mode-url'

// Retorna uma função (url) => url ajustada ao modo da URL corrente (prefixo
// "/adm" = ADMINISTRATIVO, ver proxy.ts). Usar para montar hrefs e URLs de
// fetch em client components sensíveis ao modo. A função é memoizada e tem
// identidade estável enquanto o pathname não mudar. Ver applyModeToUrl em
// lib/utils/mode-url.ts para as regras de transformação.
export function useModeUrl(): (url: string) => string {
    const pathname = usePathname()
    return useMemo(() => modeUrlFromPathname(pathname), [pathname])
}
