'use server'

import { assertCurrentUser, isUserModerator } from '@/lib/user'
import { redirect } from 'next/navigation'
import TicketsAdminClient from './tickets-admin-client'
import { modeUrl } from '@/lib/utils/prefs'

export default async function TicketsAdminPage() {
    const user = await assertCurrentUser()
    const isModerator = await isUserModerator(user)

    if (!isModerator) {
        redirect(await modeUrl('/'))
    }

    return <TicketsAdminClient />
}
