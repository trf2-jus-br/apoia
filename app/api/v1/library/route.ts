'use server'

import { NextResponse } from 'next/server'
import { Dao } from '@/lib/db/mysql'
import { assertCurrentUser } from '@/lib/user'

export async function GET() {
  await assertCurrentUser()
  const items = await Dao.listLibrary()
  const safe = items.map(({ content_binary, ...rest }: any) => rest)
  return NextResponse.json({ items: safe })
}

export async function POST(req: Request) {
  await assertCurrentUser()
  const contentType = req.headers.get('content-type') || ''
  if (contentType.startsWith('multipart/form-data')) {
    const form = await req.formData()
    const type = String(form.get('type') || '') as any
    const title = String(form.get('title') || '')
    const file = form.get('file') as File | null
    if (!type || !title) return NextResponse.json({ errormsg: 'type e title são obrigatórios' }, { status: 400 })
    let content_binary: Buffer | undefined
    let fileContentType: string | undefined
    if (file) {
      const bytes = await file.arrayBuffer()
      if (bytes.byteLength > 10 * 1024 * 1024) {
        return NextResponse.json({ errormsg: 'Arquivo maior que 10MB' }, { status: 400 })
      }
      content_binary = Buffer.from(bytes)
      fileContentType = file.type || 'application/octet-stream'
    }
    const id = await Dao.insertLibrary({ type, title, content_type: fileContentType, content_binary })
    return NextResponse.json({ id })
  } else {
    const body = await req.json()
    const { type, title, content_type, content_markdown, model_subtype } = body
    if (!type || !title) return NextResponse.json({ errormsg: 'type e title são obrigatórios' }, { status: 400 })
    const id = await Dao.insertLibrary({ type, title, content_type: content_type ?? null, content_markdown: content_markdown ?? null, model_subtype: model_subtype ?? null })
    return NextResponse.json({ id })
  }
}
