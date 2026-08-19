import { searchPangea, PANGEA_DEFAULT_ORGAOS, PANGEA_DEFAULT_TIPOS } from '@/lib/ai-tools/tools-pangea'
import { withErrorHandler, BadRequestError } from '@/lib/utils/api-error'
import { assertApiUser } from '@/lib/user'

export const maxDuration = 30

/**
 * @swagger
 * /api/v1/pangea/search:
 *   post:
 *     description: Busca teses, súmulas, OJs, temas de repercussão geral e repetitivos no Pangea
 *     tags:
 *       - pangea
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Termo de busca (mínimo 3 caracteres)
 *               page:
 *                 type: integer
 *                 description: Número da página (1-10)
 *                 default: 1
 *               orgaos:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Órgãos a filtrar (ex. STF, STJ, TST)
 *               especies:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Espécies a filtrar (ex. RG, RESP, SUM)
 *     responses:
 *       200:
 *         description: Resultados da busca
 *       400:
 *         description: Parâmetros inválidos
 */
async function POST_HANDLER(request: Request) {
    await assertApiUser()
    const body = await request.json()
    const { query, page = 1, orgaos, especies } = body

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
        throw new BadRequestError('A consulta deve ter ao menos 3 caracteres')
    }

    if (page < 1 || page > 10) {
        throw new BadRequestError('A página deve estar entre 1 e 10')
    }

    const finalOrgaos = orgaos && orgaos.length > 0 ? orgaos : PANGEA_DEFAULT_ORGAOS
    const finalTipos = especies && especies.length > 0 ? especies : PANGEA_DEFAULT_TIPOS

    const result = await searchPangea({
        query: query.trim(),
        page,
        orgaos: finalOrgaos,
        tipos: finalTipos
    })

    return Response.json(result)
}

export const POST = withErrorHandler(POST_HANDLER as any)
