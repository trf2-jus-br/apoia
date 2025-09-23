'use server'

import { NextResponse } from 'next/server'
import { Dao } from '@/lib/db/mysql'
import { assertCurrentUser, getCurrentUser } from '@/lib/user'
import { getInteropFromUser, getSystemIdAndDossierId } from '@/lib/proc/process'
import { obterConteudoDaPeca } from '@/lib/proc/piece'

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  await assertCurrentUser()
  const { id } = await props.params
  const items = await Dao.listLibraryExamples(Number(id))
  return NextResponse.json({ items })
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  await assertCurrentUser()
  const { id } = await props.params
  const body = await req.json()
  const { processNumbers, pieceType, replace } = body as { processNumbers: string, pieceType?: string, replace?: boolean }
  const numbers = (processNumbers || '')
    .split(',')
    .map(s => s.trim().replace(/\D/g, ''))
    .filter(s => s.length > 0)
  if (numbers.length === 0) return NextResponse.json({ errormsg: 'Nenhum número de processo válido informado' }, { status: 400 })

  if (replace === true) {
    // delete all then insert
    const current = await Dao.listLibraryExamples(Number(id))
    for (const ex of current) await Dao.deleteLibraryExample(Number(id), ex.process_number)
  }

  const existing = await Dao.listLibraryExamples(Number(id))
  const existingSet = new Set(existing.map(e => e.process_number))

  const user = await getCurrentUser()
  const interop = await getInteropFromUser(user as any)
  for (const pn of numbers) {
    if (existingSet.has(pn)) continue
    let selPiece: any = null
    try {
      const arrayDados = await interop.consultarProcesso(pn)
      const dados = arrayDados[arrayDados.length - 1]
      const candidates = dados.pecas || []
      const want = (pieceType as any) || 'DESPACHO_DECISAO'
      const matchDescr = want === 'DESPACHO_DECISAO' ? 'DESPACHO/DECISÃO' : want === 'SENTENCA' ? 'SENTENÇA' : 'VOTO'
      selPiece = candidates.find(p => (p.descr || '').toUpperCase().includes(matchDescr)) || candidates[0]
      let content_markdown: string | null = null
      let event_number: string | null = null
      if (selPiece) {
        const { dossier_id } = await getSystemIdAndDossierId(user as any, pn)
        const content = await obterConteudoDaPeca(dossier_id, pn, selPiece.id, selPiece.descr, selPiece.sigilo, interop)
        content_markdown = content?.conteudo || null
        event_number = selPiece.numeroDoEvento || null
      }
      await Dao.upsertLibraryExample(Number(id), {
        process_number: pn,
        event_number,
        piece_type: (pieceType as any) || null,
        piece_id: selPiece?.id || null,
        piece_title: selPiece?.descr || null,
        piece_date: selPiece?.dataHora || null,
        content_markdown,
      })
    } catch (e) {
      await Dao.upsertLibraryExample(Number(id), {
        process_number: pn,
        event_number: null,
        piece_type: (pieceType as any) || null,
        piece_id: null,
        piece_title: null,
        piece_date: null,
        content_markdown: null,
      })
    }
  }
  const items = await Dao.listLibraryExamples(Number(id))
  return NextResponse.json({ items })
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  await assertCurrentUser()
  const { id } = await props.params
  const url = new URL(req.url)
  const pn = url.searchParams.get('process_number') || ''
  if (!pn) return NextResponse.json({ errormsg: 'process_number obrigatório' }, { status: 400 })
  const ok = await Dao.deleteLibraryExample(Number(id), pn)
  if (!ok) return NextResponse.json({ errormsg: 'Not found' }, { status: 404 })
  return NextResponse.json({ status: 'OK' })
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  await assertCurrentUser()
  const { id } = await props.params
  const body = await req.json()
  const { processNumber, pieceId, pieceTitle, pieceDate, contentMarkdown, pieceType } = body as any
  if (!processNumber) return NextResponse.json({ errormsg: 'processNumber obrigatório' }, { status: 400 })
  let content_markdown = contentMarkdown ?? null
  let title = pieceTitle ?? null
  let date = pieceDate ? new Date(pieceDate) : null
  let event_number: string | null = null
  if (pieceId && !content_markdown) {
    try {
      const user = await getCurrentUser()
      const interop = await getInteropFromUser(user as any)
      const { dossier_id } = await getSystemIdAndDossierId(user as any, String(processNumber))
      const arrayDados = await interop.consultarProcesso(String(processNumber))
      const dados = arrayDados[arrayDados.length - 1]
      const sel = (dados.pecas || []).find((p: any) => p.id === pieceId)
      if (sel) {
        const c = await obterConteudoDaPeca(dossier_id, String(processNumber), sel.id, sel.descr, sel.sigilo, interop)
        content_markdown = c?.conteudo || null
        title = sel.descr || title
        date = sel.dataHora ? new Date(sel.dataHora) : date
        event_number = sel.numeroDoEvento || null
      }
    } catch {}
  }
  await Dao.upsertLibraryExample(Number(id), {
    process_number: String(processNumber),
    event_number,
    piece_type: (pieceType as any) ?? null,
    piece_id: pieceId ?? null,
    piece_title: title,
    piece_date: date,
    content_markdown,
  })
  const items = await Dao.listLibraryExamples(Number(id))
  return NextResponse.json({ items })
}

