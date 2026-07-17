import { assertCurrentUser, isUserModerator } from '@/lib/user'
import { redirect } from 'next/navigation'
import AIGenerationsReportClient from './ai-generations-report-client'
import { modeUrl } from '@/lib/utils/prefs'

export default async function AIGenerationsReportPage() {
    const user = await assertCurrentUser()
    const isModerator = await isUserModerator(user)

    if (!isModerator) {
        redirect(await modeUrl('/'))
    }

    return <AIGenerationsReportClient />
}
