import { anonymizeText } from '@/lib/anonym/anonym'
import { withErrorHandler, BadRequestError } from '@/lib/utils/api-error'

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
async function POST_HANDLER(req: Request) {
  const { text, options } = await req.json()
  if (text == null) throw new BadRequestError('Campo text é obrigatório')
  const r = anonymizeText(String(text || ''), options || {})
  return Response.json(r)
}

export const POST = withErrorHandler(POST_HANDLER as any)
