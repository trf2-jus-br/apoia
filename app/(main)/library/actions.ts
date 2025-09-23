'use server'

import { assertCurrentUser } from '@/lib/user'
import { Dao } from '@/lib/db/mysql'
import { revalidatePath } from 'next/cache'

export async function deleteLibraryAction(formData: FormData) {
  'use server'
  await assertCurrentUser()
  const idRaw = formData.get('id')
  const id = typeof idRaw === 'string' ? Number(idRaw) : Number(idRaw as any)
  if (!Number.isFinite(id)) return
  await Dao.deleteLibrary(id)
  revalidatePath('/library')
}
