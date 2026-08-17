'use server'

import { NextResponse } from 'next/server'
import { LibraryDao } from '@/lib/db/dao'
import { IALibraryShare } from '@/lib/db/mysql-types'
import { assertCurrentUser, isUserModerator } from '@/lib/user'

export async function GET() {
  await assertCurrentUser()
  const items = await LibraryDao.listLibraryHeaders()
  return NextResponse.json({ items })
}

async function validateShare(share: unknown, user: Awaited<ReturnType<typeof assertCurrentUser>>): Promise<string | null> {
  if (share === undefined || share === null) return null
  const value = String(share)
  if (!Object.values(IALibraryShare).includes(value as IALibraryShare))
    return 'Valor inválido para share'
  if (value === IALibraryShare.PADRAO && !(await isUserModerator(user)))
    return 'Apenas moderadores podem definir documentos como PADRAO'
  return null
}

export async function POST(req: Request) {
  const user = await assertCurrentUser()
  const contentType = req.headers.get('content-type') || ''
  if (contentType.startsWith('multipart/form-data')) {
    const form = await req.formData()
    const kind = String(form.get('kind') || '') as any
    const title = String(form.get('title') || '')
    const share = form.get('share')
    const file = form.get('file') as File | null
    if (!kind || !title) return NextResponse.json({ errormsg: 'kind e title são obrigatórios' }, { status: 400 })
    const shareError = await validateShare(share === null ? undefined : String(share), user)
    if (shareError) return NextResponse.json({ errormsg: shareError }, { status: 403 })
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
    const id = await LibraryDao.insertLibrary({ kind, title, content_type: fileContentType, content_binary, ...(share !== null ? { share: String(share) as IALibraryShare } : {}) })
    return NextResponse.json({ id })
  } else {
    const body = await req.json()
    const { kind, title, content_type, content_markdown, model_subtype, inclusion, context, share } = body
    if (!kind || !title) return NextResponse.json({ errormsg: 'kind e title são obrigatórios' }, { status: 400 })
    const shareError = await validateShare(share, user)
    if (shareError) return NextResponse.json({ errormsg: shareError }, { status: 403 })
    const id = await LibraryDao.insertLibrary({
      kind,
      title,
      content_type: content_type ?? null,
      content_markdown: content_markdown ?? null,
      model_subtype: model_subtype ?? null,
      inclusion: inclusion ?? 'NAO',
      context: context ?? null,
      share: share ?? undefined,
    })
    return NextResponse.json({ id })
  }
}
