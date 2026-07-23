import { assertCurrentUser, isUserModerator } from '@/lib/user'
import { redirect } from 'next/navigation'
import EditPromptClient from './edit-prompt-client'
import { modeUrl } from '@/lib/utils/prefs'

export default async function EditPromptPage() {
    const user = await assertCurrentUser()
    const isModerator = await isUserModerator(user)

    if (!isModerator) {
        redirect(await modeUrl('/'))
    }

    return <EditPromptClient />
}
