'use server'

import { assertCurrentUser, isUserModerator } from '@/lib/user'
import { redirect } from 'next/navigation'
import EditPromptClient from './edit-prompt-client'

export default async function EditPromptPage() {
    const user = await assertCurrentUser()
    const isModerator = await isUserModerator(user)
    
    if (!isModerator) {
        redirect('/')
    }
    
    return <EditPromptClient />
}
