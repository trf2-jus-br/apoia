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
  .alert-note { background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 0.375rem; padding: 0.75rem 1.25rem; margin-top: 0.0rem; margin-bottom: 1.5rem; color: #856404; }
  .alert-note a { color: #0c5460; text-decoration: underline; }
  .alert-note a:hover { color: #084298; }
</style>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Processo ${row.title}",
  "datePublished": "${new Date(row.created_at).toISOString().substring(0, 10)}",
  "author": {"@type": "Person", "name": "Apoia"}
}
</script>
</head>
<body>
<div class="alert-note" aria-hidden="true">Para escutar, use a função "Ouvir esta página" do <a target="_blank" href="https://support.google.com/chrome/answer/14768725?hl=pt-br">Android</a> ou do <a target="_blank" href="https://support.apple.com/pt-br/guide/iphone/iph449fc616c/ios">iOS</a>.</div>

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
