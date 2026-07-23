import { unstable_noStore as noStore } from 'next/cache'
import { UserDao, PromptDao } from '@/lib/db/dao'
import { redirect } from 'next/navigation';
import { assertCurrentUser } from '@/lib/user'
import { modeUrl } from '@/lib/utils/prefs'

export default async function Home(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    noStore()
    const user = await assertCurrentUser()
    const user_id = await UserDao.assertIAUserId(user.preferredUsername || user.name)

    const idStr = params.id
    await PromptDao.resetFavoriteByUuid(idStr, user_id)

    redirect(await modeUrl(`/prompts`))
    return null
}