'use server'

import { assertCurrentUser, isUserModerator } from '@/lib/user'
import { redirect } from 'next/navigation'
import TransferPromptClient from './transfer-prompt-client'
import { modeUrl } from '@/lib/utils/prefs'

export default async function TransferPromptPage() {
    const user = await assertCurrentUser()
    const isModerator = await isUserModerator(user)
    
    if (!isModerator) {
        redirect(await modeUrl('/'))
    }
    
    return <TransferPromptClient />
}
