'use server'

import { unstable_noStore as noStore } from 'next/cache'
import { UserDao, LibraryDao } from '@/lib/db/dao'
import { redirect } from 'next/navigation';
import { assertCurrentUser } from '@/lib/user'
import { modeUrl } from '@/lib/utils/prefs'

export default async function Page(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    noStore()
    const user = await assertCurrentUser()
    const user_id = await UserDao.assertIAUserId(user.preferredUsername || user.name)

    await LibraryDao.resetFavorite(parseInt(params.id), user_id)

    redirect(await modeUrl(`/library`))
    return null
}
