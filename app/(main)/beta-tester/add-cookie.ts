'use server'

import { cookies } from 'next/headers'

export async function addBetaTesterCookie() {
    const cookieStore = await cookies()
    cookieStore.set('beta-tester', '2', { maxAge: 60 * 60 * 24 * 90 }) // 3 months in seconds
    return null
}