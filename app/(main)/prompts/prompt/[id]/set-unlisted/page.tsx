'use server'

import { unstable_noStore as noStore } from 'next/cache'
import { PromptDao } from '@/lib/db/dao'
import { redirect } from 'next/navigation'
import { assertCurrentUser, isUserModerator } from '@/lib/user'
import { modeUrl } from '@/lib/utils/prefs'

export default async function Home(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    noStore()
    const user = await assertCurrentUser()
    if (await isUserModerator(user))
        await PromptDao.setUnlisted(parseInt(params.id))
    redirect(await modeUrl(`/prompts`))
    return null
}