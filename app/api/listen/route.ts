export const runtime = 'nodejs'

import { BadRequestError, withErrorHandler } from '@/lib/utils/api-error'
import { NextResponse } from 'next/server'

async function POST_HANDLER(req: Request) {
    const formData = await req.formData()
    const html = formData.get('html') as string
    if (!html) throw new BadRequestError('Campo html é obrigatório')

    return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
}

export const POST = withErrorHandler(POST_HANDLER)
