import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/utils/crypt'
import { buildJweToken } from '@/lib/utils/jwt'
import { getInterop } from '@/lib/interop/interop'
import { ApiError, BadRequestError, withErrorHandler } from '@/lib/utils/api-error'

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
async function POST_HANDLER(request: Request) {
    const body = await request.json()
    if (!body?.system || !body?.email || !body?.password) {
        throw new BadRequestError('Parâmetros obrigatórios ausentes')
    }
    const autenticado = await getInterop(body.system, body.email, body.password).autenticar(body.system)

    if (!autenticado)
        throw new ApiError('Usuário ou senha inválidos', 401)

    const password = encrypt(body.password)
    const token = await buildJweToken({ name: body.email, password, system: body.system })
    return NextResponse.json({ token }, { status: 200 });
}

export const POST = withErrorHandler(POST_HANDLER as any)
