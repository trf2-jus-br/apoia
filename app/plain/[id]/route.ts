export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import knex from '@/lib/db/knex'

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
    const id = (await props.params).id?.replace(/\.html$/, '') || ''
    const row = await knex!('ia_plain').where({ id }).first()
    if (!row) {
        return new NextResponse('Página não encontrada.', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    }
    const page = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${row.title || 'Processo'}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; line-height: 1.8; font-size: 1.1rem; color: #222; }
  h1, h2, h3 { margin-top: 1.5rem; }
  p { margin-bottom: 1rem; }
</style>
</head>
<body>
${row.html}
</body>
</html>`
    return new NextResponse(page, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=300, s-maxage=300',
        },
    })
}
