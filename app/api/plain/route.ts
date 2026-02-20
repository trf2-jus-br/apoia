export const runtime = 'nodejs'

import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { BadRequestError, withErrorHandler } from '@/lib/utils/api-error'
import knex from '@/lib/db/knex'
import { assertApiUser } from '@/lib/user'
import { JSDOM } from 'jsdom'
import DOMPurify from 'dompurify'

function sanitize(html: string): string {
    const { window } = new JSDOM('')
    const purify = DOMPurify(window as any)
    return purify.sanitize(html, {
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus',
            'onblur', 'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress'],
        FORCE_BODY: true,
    })
}

async function POST_HANDLER(req: Request) {
    const user = await assertApiUser()
    const { html, title } = await req.json()
    if (!html) throw new BadRequestError('Campo html é obrigatório')

    // Limpar entradas com mais de 30 dias
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    await knex!('ia_plain').where('created_at', '<', cutoff).delete()

    const id = randomUUID()
    await knex!('ia_plain').insert({ id, html: sanitize(html), title: title || 'Processo' })

    return NextResponse.json({ id })
}

export const POST = withErrorHandler(POST_HANDLER as any)
