'use server'

import { LibraryDao } from '@/lib/db/dao'
import { assertCurrentUser, isUserModerator } from '@/lib/user'
import Contents from './contents'

export default async function ServerContents() {
  const user = await assertCurrentUser()
  const items = await LibraryDao.listLibraryHeaders()

  return <Contents items={items} isModerator={await isUserModerator(user)} />
}
