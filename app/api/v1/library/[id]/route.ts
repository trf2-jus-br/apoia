'use server'

import { NextResponse } from 'next/server'
import { LibraryDao } from '@/lib/db/dao'
import { IALibraryShare } from '@/lib/db/mysql-types'
import { assertCurrentUser, isUserModerator } from '@/lib/user'

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  await assertCurrentUser()
  const { id } = await props.params
  const item = await LibraryDao.getLibraryById(id)
  if (!item) return NextResponse.json({ errormsg: 'Not found' }, { status: 404 })
  const { content_binary, ...safe } = item as any
  return NextResponse.json(safe)
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await assertCurrentUser()
  const { id } = await props.params
  const body = await req.json()
  if (body.share !== undefined) {
    if (!Object.values(IALibraryShare).includes(body.share as IALibraryShare))
      return NextResponse.json({ errormsg: 'Valor inválido para share' }, { status: 400 })
    if (body.share === IALibraryShare.PADRAO && !(await isUserModerator(user)))
      return NextResponse.json({ errormsg: 'Apenas moderadores podem definir documentos como PADRAO' }, { status: 403 })
  }
  const libraryId = await LibraryDao.resolveLibraryId(id)
  if (!libraryId) return NextResponse.json({ errormsg: 'Not found' }, { status: 404 })
  const ok = await LibraryDao.updateLibrary(libraryId, body)
  if (!ok) return NextResponse.json({ errormsg: 'Not found' }, { status: 404 })
  return NextResponse.json({ status: 'OK' })
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  await assertCurrentUser()
  const { id } = await props.params
  const libraryId = await LibraryDao.resolveLibraryId(id)
  if (!libraryId) return NextResponse.json({ errormsg: 'Not found' }, { status: 404 })
  const ok = await LibraryDao.deleteLibrary(libraryId)
  if (!ok) return NextResponse.json({ errormsg: 'Not found' }, { status: 404 })
  return NextResponse.json({ status: 'OK' })
}
