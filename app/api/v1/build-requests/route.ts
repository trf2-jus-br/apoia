import { NextRequest, NextResponse } from 'next/server'
import { assertApiUser } from '@/lib/user'
import { buildRequests } from '@/lib/ai/build-requests'
import { BadRequestError, withErrorHandler } from '@/lib/utils/api-error'

export const maxDuration = 60

async function POST_HANDLER(req: NextRequest) {
    await assertApiUser()

    const body = await req.json()
    const { prompt, documentosDaBiblioteca, numeroDoProcesso, selectedPieces, contents } = body

    if (!prompt || !numeroDoProcesso || !Array.isArray(selectedPieces)) {
        throw new BadRequestError('Parâmetros inválidos')
    }

    const result = await buildRequests(prompt, documentosDaBiblioteca, numeroDoProcesso, selectedPieces, contents)

    // Strip non-serializable fields before returning
    const serializable = result.map(({ result: _result, ...rest }) => rest)

    return NextResponse.json(serializable)
}

export const POST = withErrorHandler(POST_HANDLER as any)
