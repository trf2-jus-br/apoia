import { searchSemantic } from '@/lib/ai-tools/tools-semantic-search'
import { withErrorHandler, BadRequestError } from '@/lib/utils/api-error'

export const maxDuration = 30

/**
 * @swagger
 * /api/v1/semantic/search:
 *   post:
 *     description: Busca semântica de temas de repercussão geral (STF) e recursos especiais repetitivos (STJ)
 *     tags:
 *       - semantic
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
 *               limit:
 *                 type: integer
 *                 description: Número de resultados (1-50)
 *                 default: 10
 *               offset:
 *                 type: integer
 *                 description: Offset para paginação
 *                 default: 0
 *     responses:
 *       200:
 *         description: Resultados da busca semântica
 *       400:
 *         description: Parâmetros inválidos
 */
async function POST_HANDLER(request: Request) {
    const body = await request.json()
    const { query, limit = 10, offset = 0 } = body

    if (!query || typeof query !== 'string' || query.trim().length < 1) {
        throw new BadRequestError('A consulta deve ter ao menos 1 caractere')
    }

    if (limit < 1 || limit > 50) {
        throw new BadRequestError('O limite deve estar entre 1 e 50')
    }

    // Filtrar apenas temas de STF-RG e STJ-RR
    const result = await searchSemantic({
        query: query.trim(),
        sourceSlugs: ['stf-rg', 'stj-rr'],
        limit,
        offset,
        searchType: 'hybrid',
        hybridAlpha: 0.5
    })

    return Response.json(result)
}

export const POST = withErrorHandler(POST_HANDLER as any)
