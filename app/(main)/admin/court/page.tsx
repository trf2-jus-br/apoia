import { assertCurrentUser, isUserModerator } from '@/lib/user'
import { redirect } from 'next/navigation'
import CourtCrudClient from './court-crud-client'
import { modeUrl } from '@/lib/utils/prefs'

export default async function CourtAdminPage() {
    const user = await assertCurrentUser()
    const isModerator = await isUserModerator(user)
    
    if (!isModerator) {
        redirect(await modeUrl('/'))
    }
    
    return <CourtCrudClient />
}
