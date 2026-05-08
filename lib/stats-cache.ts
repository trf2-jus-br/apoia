import { unstable_cache } from 'next/cache'
import { StatsDao } from '@/lib/db/dao'
import devLog from '@/lib/utils/log'

// Cache de 24 horas para as estatísticas globais
// A função será executada apenas 1x a cada 24h, independente do número de requisições
// Não recebe parâmetros para evitar problemas com dados dinâmicos
export const getGlobalStatsCached = unstable_cache(
    async () => {
        devLog('Cache miss: fetching global stats for general cache')
        return await StatsDao.getGlobalStats()
    },
    ['global-stats'], // cache key
    {
        revalidate: 86400, // 24 horas em segundos
        tags: ['global-stats'] // permite invalidação manual com revalidateTag('global-stats')
    }
)