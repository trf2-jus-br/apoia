import { anonymizeText } from '@/lib/anonym/anonym'
import { getCurrentUser } from '@/lib/user'

export const maxDuration = 30

/**
 * @swagger
 * /api/v1/anonym:
 *   post:
 *     description: Anonimiza um texto conforme opções selecionadas.
 *     tags:
 *       - utils
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *               options:
 *                 type: object
 *                 additionalProperties: true
 *     responses:
 *       200:
 *         description: Texto anonimizado.
 *       401:
 *         description: Não autorizado.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ errormsg: 'Unauthorized' }, { status: 401 })

  const { text, options } = await req.json()
  const r = anonymizeText(String(text || ''), options || {})
  return Response.json(r)
}
