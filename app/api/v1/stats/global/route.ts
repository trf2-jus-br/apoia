import { NextRequest, NextResponse } from 'next/server'
import { assertApiUser, isUserCorporativo } from '@/lib/user'
import { ForbiddenError, withErrorHandler } from '@/lib/utils/api-error'
import { getGlobalStatsCached } from '@/lib/stats-cache'

/**
 * @swagger
 * /api/v1/stats/global:
 *   get:
 *     summary: Retorna estatísticas globais da comunidade
 *     description: Retorna KPIs globais, ranking de tribunais, top contribuidores e prompts em alta (cache de 24h)
 *     tags:
 *       - Stats
 *     responses:
 *       200:
 *         description: Estatísticas globais
 *       401:
 *         description: Usuário não autenticado
 *       403:
 *         description: Usuário não é corporativo
 */
async function GET_HANDLER(req: NextRequest) {
    // IMPORTANTE: Valida autenticação e permissões ANTES de buscar dados cacheados
    // Isso garante que mesmo com cache, a segurança é verificada em cada requisição
    const user = await assertApiUser()
    
    if (!await isUserCorporativo(user)) {
        throw new ForbiddenError('Acesso restrito a usuários corporativos')
    }

    // Busca dados do cache (StatsDao.getGlobalStats só executa 1x a cada 24h)
    // Como a validação de segurança foi feita acima, podemos buscar os dados cacheados
    const stats = await getGlobalStatsCached()

    return NextResponse.json(stats)
}

export const GET = withErrorHandler(GET_HANDLER as any)
