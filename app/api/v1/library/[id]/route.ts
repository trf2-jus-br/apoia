'use server'

import { NextResponse } from 'next/server'
import { Dao } from '@/lib/db/mysql'
import { assertCurrentUser } from '@/lib/user'

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  await assertCurrentUser()
  const { id } = await props.params
  const item = await Dao.getLibraryById(Number(id))
  if (!item) return NextResponse.json({ errormsg: 'Not found' }, { status: 404 })
  const { content_binary, ...safe } = item as any
  return NextResponse.json(safe)
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  await assertCurrentUser()
  const { id } = await props.params
  const body = await req.json()
  const ok = await Dao.updateLibrary(Number(id), body)
  if (!ok) return NextResponse.json({ errormsg: 'Not found' }, { status: 404 })
  return NextResponse.json({ status: 'OK' })
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  await assertCurrentUser()
  const { id } = await props.params
  const ok = await Dao.deleteLibrary(Number(id))
  if (!ok) return NextResponse.json({ errormsg: 'Not found' }, { status: 404 })
  return NextResponse.json({ status: 'OK' })
}
