'use client'

import { useModeUrl } from '@/lib/utils/use-mode-url'
import Link from 'next/link'
// import { headers } from 'next/headers'

export const NavigationLink = (params: { href: string, text: string, className?: string, accessKey?: string }) => {
    const modeUrl = useModeUrl()
    // const headersList = headers()
    // const fullUrl = headersList.get('referer') || ""
    // const pathname = new URL(fullUrl).pathname
    let c = "nav-link me-3"
    if (params.className)
        c += params.className
    // if (pathname == params.href)
    //     c += " link-active"

    const prefixed = typeof params.href === 'string' ? modeUrl(params.href) : params.href
    return (
        <Link href={prefixed} className={c} accessKey={params.accessKey}>
            <span dangerouslySetInnerHTML={{ __html: params.text }} />
        </Link>
    )
}