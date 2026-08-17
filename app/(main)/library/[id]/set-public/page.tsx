import { unstable_noStore as noStore } from 'next/cache'
import { LibraryDao } from '@/lib/db/dao'
import { redirect } from 'next/navigation'
import { assertCurrentUser, isUserModerator } from '@/lib/user'
import { modeUrl } from '@/lib/utils/prefs'

// O parâmetro é o uuid do documento; share é propriedade do documento, aplicada a todas as versões.
export default async function Page(props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    noStore()
    const user = await assertCurrentUser()
    if (await isUserModerator(user))
        await LibraryDao.setPublic(params.id)
    redirect(await modeUrl(`/library`))
    return null
}
