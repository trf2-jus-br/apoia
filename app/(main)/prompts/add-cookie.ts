'use server'

import { cookies } from 'next/headers'

export async function addListPublicPromptsCookie() {
    const cookieStore = await cookies()
    cookieStore.set('list-public-prompts', '1', { maxAge: 60 * 60 * 24 * 90 }) // 3 months in seconds
    return null
}

export async function removeListPublicPromptsCookie() {
    const cookieStore = await cookies()
    cookieStore.delete('list-public-prompts')
    return null
}