import Fetcher from '../../../../lib/utils/fetcher'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/utils/crypt'
import { buildJweToken } from '@/lib/utils/jwt'
import { getInterop } from '@/lib/interop/interop'

/**
 * @swagger
 * 
 * /api/v1/signin:
 *   post:
 *     description: Autentica o usuário
 *     tags:
 *       - auth
 *     accepts: 
 *       - application/json
 *     requestBody:
 *       description: Optional description in *Markdown*
 *       required: true
 *       content:
 *         application/json:
 *          schema:
 *            type: object
 *            properties:
 *              system:
 *                type: string
 *                description: Sistema a ser acessado, por exemplo, "TRF2" ou "JFRJ"
 *              email:
 *                type: string
 *                description: Email ou outro identificador do usuário no MNI
 *              password:
 *                type: string
 *                description: Senha do usuário no MNI
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token de autenticação para ser usado na API
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const autenticado = await getInterop(body.system, body.email, body.password).autenticar(body.system)

        if (!autenticado)
            throw new Error('Usuário ou senha inválidos')

        const password = encrypt(body.password)
        const token = await buildJweToken({ name: body.email, password, system: body.system })
        return NextResponse.json({ token }, { status: 200 });
    } catch (error) {
        const message = Fetcher.processError(error)
        return NextResponse.json({ message: `${message}` }, { status: 405 });
    }
};
