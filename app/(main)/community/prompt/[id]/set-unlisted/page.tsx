'use server'

import { unstable_noStore as noStore } from 'next/cache'
import { Dao } from '@/lib/db/mysql'
import { redirect } from 'next/navigation'
import { assertCurrentUser, isUserModerator } from '@/lib/user'

export default async function Home(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    noStore()
    const user = await assertCurrentUser()
    if (await isUserModerator(user))
        await Dao.setUnlisted(parseInt(params.id))
    redirect('/community')
    return null
}