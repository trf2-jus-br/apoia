import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/utils/crypt'
import { getInterop } from '@/lib/interop/interop'
import { ApiError, BadRequestError, withErrorHandler } from '@/lib/utils/api-error'

async function POST_HANDLER(request: Request) {
    const body = await request.json()
    if (!body?.system || !body?.email || !body?.password) {
        throw new BadRequestError('Parâmetros obrigatórios ausentes')
    }
    const autenticado = await getInterop(body.system, body.email, body.password).autenticar(body.system)

    if (!autenticado)
        throw new ApiError('Usuário ou senha inválidos', 401)

    const password = encrypt(body.password)
    const resp: any = { name: body.email, email: body.email, image: { password, system: body.system } }
    return NextResponse.json(resp, { status: 200 });
}

export const POST = withErrorHandler(POST_HANDLER as any)
