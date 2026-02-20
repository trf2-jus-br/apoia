import { NextRequest, NextResponse } from 'next/server'
import { assertApiUser } from '@/lib/user'
import { withErrorHandler } from '@/lib/utils/api-error'
import { envString } from '@/lib/utils/env'

async function POST_HANDLER(req: NextRequest) {
    // Autentica o usuário
    await assertApiUser()

    const apiUrl = envString("SEMANTIC_SEARCH_API_URL")
    
    // Obtém o body da requisição
    const body = await req.json()

    // Faz a chamada para a API externa
    const response = await fetch(`${apiUrl}/search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        return NextResponse.json(
            { error: 'Erro ao realizar busca' },
            { status: response.status }
        )
    }

    const data = await response.json()
    return NextResponse.json(data)
}

export const POST = withErrorHandler(POST_HANDLER)
