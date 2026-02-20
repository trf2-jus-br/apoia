import { NextRequest, NextResponse } from 'next/server'
import { assertApiUser } from '@/lib/user'
import { withErrorHandler } from '@/lib/utils/api-error'
import { envString } from '@/lib/utils/env'

async function GET_HANDLER(req: NextRequest) {
    // Autentica o usuário
    await assertApiUser()

    const apiUrl = envString("SEMANTIC_SEARCH_API_URL")
    
    // Faz a chamada para a API externa
    const response = await fetch(`${apiUrl}/sources`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })

    if (!response.ok) {
        return NextResponse.json(
            { error: 'Erro ao buscar fontes' },
            { status: response.status }
        )
    }

    const data = await response.json()
    return NextResponse.json(data)
}

export const GET = withErrorHandler(GET_HANDLER)
