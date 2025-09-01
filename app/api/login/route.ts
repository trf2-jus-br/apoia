import Fetcher from '../../../lib/utils/fetcher'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/utils/crypt'
import { getInterop } from '@/lib/interop/interop'

export async function POST(request: Request) {
    try {
        // const body = JSON.parse(JSON.stringify(request.body))
        const body = await request.json()
        const autenticado = await getInterop(body.system, body.email, body.password).autenticar(body.system)

        if (!autenticado)
            throw new Error('Usuário ou senha inválidos')

        const password = encrypt(body.password)
        const resp: any = { name: body.email, email: body.email, image: { password, system: body.system } }

        // const token = await buildJweToken({ name: body.email, password, system: body.system })
        // resp.token = token

        return NextResponse.json(resp, { status: 200 });
    } catch (error) {
        const message = Fetcher.processError(error)
        return NextResponse.json({ message: `${message}` }, { status: 405 });
    }
};
