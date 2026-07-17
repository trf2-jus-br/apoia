'use client'

import Link from 'next/link'
import { ComponentProps } from 'react'
import { useModeUrl } from '@/lib/utils/use-mode-url'

// Drop-in replacement de next/link que preserva o prefixo de modo ("/adm") da
// URL corrente. Usar nos links sensíveis ao modo; para navegação agnóstica,
// continuar usando next/link diretamente.
export default function ModeLink({ href, ...props }: ComponentProps<typeof Link>) {
    const modeUrl = useModeUrl()
    const prefixed = typeof href === 'string' ? modeUrl(href) : href
    return <Link href={prefixed} {...props} />
}
