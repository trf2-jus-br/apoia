import { fixPromptList } from '@/lib/prompt-list'
import knex from '../knex'
import * as mysqlTypes from '../mysql-types'
import { CourtDao } from './court.dao'
import { PromptDao } from './prompt.dao'
import { RatingDao } from './rating.dao'
import { STATS_CONFIG } from '@/lib/utils/stats-config'

export class StatsDao {
    // ==================== ESTATÍSTICAS GLOBAIS ====================

    /**
     * Retorna o total de execuções de prompts do banco
     * Baseado em ia_generation
     */
    static async getTotalExecutions(): Promise<number> {
        if (!knex) return 0
        const result = await knex('ia_generation')
            .count('id as total')
            .first()
        return Number(result?.total) || 0
    }

    /**
     * Retorna o total de usuários ativos nos últimos N dias
     */
    static async getTotalActiveUsers(days: number = STATS_CONFIG.PERIODO_USUARIOS_ATIVOS_DIAS): Promise<number> {
        if (!knex) return 0
        const dateLimit = new Date()
        dateLimit.setDate(dateLimit.getDate() - days)

        const result = await knex('ia_generation')
            .whereNotNull('created_by')
            .andWhere('created_at', '>=', dateLimit.toISOString().split('T')[0] + ' 00:00:00')
            .countDistinct('created_by as count')
            .first()
        return Number(result?.count) || 0
    }

    /**
     * Retorna o total de tribunais únicos com usuários
     */
    static async getTotalCourts(): Promise<number> {
        if (!knex) return 0
        const result = await knex('ia_user')
            .whereNotNull('court_id')
            .countDistinct('court_id as count')
            .first()
        return Number(result?.count) || 0
    }

    /**
     * Retorna o ranking de tribunais por execuções
     */
    static async getCourtRanking(limit: number = 10): Promise<mysqlTypes.CourtRankingItem[]> {
        if (!knex) return []

        const stats = await knex('ia_generation as g')
            .join('ia_user as u', 'u.id', 'g.created_by')
            .whereNotNull('u.court_id')
            .groupBy('u.court_id')
            .select(
                'u.court_id as courtId',
                knex.raw('COUNT(g.id) as "totalExecutions"')
            )
            .orderByRaw('COUNT(g.id) DESC')
            .limit(limit)

        const result: mysqlTypes.CourtRankingItem[] = []
        for (const stat of stats) {
            const court = await CourtDao.getOrFetchCourt(stat.courtId)
            result.push({
                courtId: stat.courtId,
                sigla: court?.sigla || `Court ${stat.courtId}`,
                nome: court?.nome || `Tribunal ${stat.courtId}`,
                totalExecutions: Number(stat.totalExecutions)
            })
        }

        return result
    }

    /**
     * Retorna os top contribuidores (autores de prompts)
     * Usa PromptDao.retrievePromptUsageReport que já funciona corretamente
     */
    static async getTopContributors(limit: number = 10): Promise<mysqlTypes.TopContributorItem[]> {
        if (!knex) return []

        const dateLimit = new Date()
        dateLimit.setDate(dateLimit.getDate() - STATS_CONFIG.PERIODO_TRENDING_DIAS)
        const startDate = dateLimit.toISOString().split('T')[0]
        const endDate = new Date().toISOString().split('T')[0]

        // Usar PromptDao.retrievePromptUsageReport que já funciona
        const usageReport = await PromptDao.retrievePromptUsageReport({ startDate, endDate })

        // Carregar prompts públicos/padrão para obter created_by
        const prompts = await knex('ia_prompt')
            // .whereIn('share', ['PUBLICO', 'PADRAO'])
            .select('id', 'base_id', 'created_by')

        const promptMap = new Map<number, { base_id: number, created_by: number | null }>()
        prompts.forEach(p => promptMap.set(p.id, { base_id: p.base_id, created_by: p.created_by }))

        // Agrupar execuções por autor
        const authorExecutions = new Map<number, number>()
        const authorBaseIds = new Map<number, Set<number>>()

        for (const row of usageReport) {
            // Usar prompt_key que pode ser "prompt-X" ou outro valor
            const match = /^prompt-(\d+)$/.exec(row.prompt_key)
            if (!match) continue

            const promptId = parseInt(match[1], 10)
            const promptInfo = promptMap.get(promptId)
            if (!promptInfo || !promptInfo.created_by) continue

            const authorId = promptInfo.created_by
            const currentCount = authorExecutions.get(authorId) || 0
            authorExecutions.set(authorId, currentCount + row.usage_count)

            if (!authorBaseIds.has(authorId)) {
                authorBaseIds.set(authorId, new Set())
            }
            authorBaseIds.get(authorId)!.add(promptInfo.base_id)
        }

        // Buscar informações dos autores
        const authorIds = [...authorExecutions.keys()]
        if (authorIds.length === 0) return []

        const authors = await knex('ia_user as u')
            .leftJoin('ia_court as c', 'c.id', 'u.court_id')
            .whereIn('u.id', authorIds)
            .select('u.id as userId', 'u.name', 'u.username', 'c.sigla as courtSigla')

        const authorMap = new Map<number, { name: string, username: string, courtSigla: string | null }>()
        authors.forEach((a: any) => authorMap.set(a.userId, { name: a.name, username: a.username, courtSigla: a.courtSigla }))

        // Montar resultado com ratings
        const result: mysqlTypes.TopContributorItem[] = []

        for (const [authorId, totalExecutions] of authorExecutions) {
            const authorInfo = authorMap.get(authorId)
            if (!authorInfo) continue

            const baseIds = [...(authorBaseIds.get(authorId) || [])]

            let totalStars = 0
            let totalRatings = 0
            if (baseIds.length > 0) {
                const ratings = await knex('ia_prompt_rating')
                    .whereIn('prompt_base_id', baseIds)
                    .where('created_at', '>=', startDate + ' 00:00:00')
                    .select(
                        knex.raw('SUM(stars) as totalStars'),
                        knex.raw('COUNT(*) as totalRatings')
                    )
                    .first() as any
                totalStars = Number(ratings?.totalStars) || 0
                totalRatings = Number(ratings?.totalRatings) || 0
            }

            const avgStars = totalRatings > 0 ? totalStars / totalRatings : 0
            const score = totalExecutions + (avgStars * 10)

            result.push({
                userId: authorId,
                name: authorInfo.name || authorInfo.username,
                username: authorInfo.username,
                courtSigla: authorInfo.courtSigla,
                totalExecutions,
                avgStars: Number(avgStars.toFixed(1)),
                totalRatings,
                score: Number(score.toFixed(1))
            })
        }

        // Ordenar por score e limitar
        return result
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
    }

    /**
     * Retorna os prompts em alta (trending)
     * Usa PromptDao.retrievePromptUsageReport que já funciona corretamente
     */
    static async getTrendingPrompts(limit: number = 10): Promise<mysqlTypes.TrendingPromptItem[]> {
        if (!knex) return []

        const dateLimit = new Date()
        dateLimit.setDate(dateLimit.getDate() - STATS_CONFIG.PERIODO_TRENDING_DIAS)
        const startDate = dateLimit.toISOString().split('T')[0]
        const endDate = new Date().toISOString().split('T')[0]

        // Usar PromptDao.retrievePromptUsageReport que já funciona
        const usageReport = await PromptDao.retrievePromptUsageReport({ startDate, endDate })

        // Filtrar apenas prompts (não outros tipos como 'analise', 'headnote', etc)
        // e agrupar por prompt_key somando usage_count
        const promptUsage = new Map<string, { total: number }>()

        for (const row of usageReport) {
            const current = promptUsage.get(row.prompt_name) || { total: 0 }
            current.total += row.usage_count
            promptUsage.set(row.prompt_name, current)
        }

        // Ordenar por total e pegar top N
        const sorted = [...promptUsage.entries()]
            .sort((a, b) => b[1].total - a[1].total)

        // Obter a lista de prompts e seus ratings
        const basePrompts = await PromptDao.retrieveLatestPrompts(0, false)
        const prompts = await fixPromptList(basePrompts, false, false) // false = not beta tester for global stats

        // Carrega todos os ratings e agrega aos prompts
        const ratingsStats = await RatingDao.getAllPromptRatingStats()
        const ratingsMap = new Map(ratingsStats.map(stat => [stat.prompt_base_id, stat]))

        // Adiciona informação de rating a cada prompt
        const promptsWithRatings = prompts.map(prompt => ({
            ...prompt,
            rating: ratingsMap.get(prompt.base_id || prompt.id) || null
        }))

        // Cria um mapa de promptsWithRatings por nome
        const promptByName = new Map<string, mysqlTypes.IAPromptList & { rating: mysqlTypes.IAPromptRatingStats | null }>()
        for (const prompt of promptsWithRatings) {
            promptByName.set(prompt.name, prompt)
            if (prompt.slug) promptByName.set(prompt.slug, prompt)
        }

        // Buscar informações adicionais (autor, ratings) para cada prompt
        const result: mysqlTypes.TrendingPromptItem[] = []

        for (const [name, usage] of sorted) {
            const promptInfo = promptByName.get(name)
            if (!promptInfo) continue
            if (!promptInfo.content?.author || promptInfo.content?.author === '-') continue // Ignorar prompts sem autor definido

            result.push({
                promptBaseId: promptInfo.base_id,
                promptName: promptInfo.name,
                authorName: (!promptInfo.content?.author || promptInfo.content?.author === '-') ? '(Interno)' : promptInfo.content?.author,
                executionsLast30Days: usage.total,
                avgStars: promptInfo.rating?.avg_laplace ? Number(Number(promptInfo.rating.avg_laplace).toFixed(1)) : null,
                totalRatings: Number(promptInfo.rating?.voter_count) || 0
            })
        }

        return result.slice(0, limit)
    }

    /**
     * Retorna os top usuários por execuções nos últimos 30 dias
     */
    static async getTopUsers(limit: number = 10): Promise<mysqlTypes.TopUserItem[]> {
        if (!knex) return []

        const dateLimit = new Date()
        dateLimit.setDate(dateLimit.getDate() - STATS_CONFIG.PERIODO_TRENDING_DIAS)

        const users = await knex('ia_generation as g')
            .join('ia_user as u', 'u.id', 'g.created_by')
            .leftJoin('ia_court as c', 'c.id', 'u.court_id')
            // .whereNotNull('g.prompt_id')
            .andWhere('g.created_at', '>=', dateLimit.toISOString().split('T')[0] + ' 00:00:00')
            .groupBy('u.id', 'u.name', 'u.username', 'c.sigla')
            .select(
                'u.id as userId',
                'u.name',
                'u.username',
                'c.sigla as courtSigla',
                knex.raw('COUNT(g.id) as "totalExecutions"')
            )
            .orderByRaw('COUNT(g.id) DESC')
            .limit(limit)

        return users.map((u: any) => ({
            userId: u.userId,
            name: u.name || u.username,
            username: u.username,
            courtSigla: u.courtSigla,
            totalExecutions: Number(u.totalExecutions)
        }))
    }

    /**
     * Retorna todas as estatísticas globais
     */
    static async getGlobalStats(): Promise<mysqlTypes.GlobalStats> {
        const [totalExecutions, totalActiveUsers, totalCourts, courtRanking, topContributors, topUsers, trendingPrompts] = await Promise.all([
            this.getTotalExecutions(),
            this.getTotalActiveUsers(),
            this.getTotalCourts(),
            this.getCourtRanking(),
            this.getTopContributors(),
            this.getTopUsers(),
            this.getTrendingPrompts()
        ])

        const totalHoursSaved = (totalExecutions * STATS_CONFIG.TEMPO_MEDIO_ECONOMIA_POR_EXECUCAO_MINUTOS) / 60

        return {
            totalExecutions,
            totalHoursSaved: Number(totalHoursSaved.toFixed(1)),
            totalActiveUsers,
            totalCourts,
            courtRanking,
            topContributors,
            topUsers,
            trendingPrompts
        }
    }

    // ==================== ESTATÍSTICAS DO USUÁRIO ====================

    /**
     * Retorna o total de execuções do usuário
     */
    static async getUserTotalExecutions(userId: number): Promise<number> {
        if (!knex) return 0
        const result = await knex('ia_generation')
            .where('created_by', userId)
            // .whereNotNull('prompt_id')
            .count('id as total')
            .first()
        return Number(result?.total) || 0
    }

    /**
     * Retorna o número de prompts criados pelo usuário (públicos/padrão)
     */
    static async getUserPromptsCreatedCount(userId: number): Promise<number> {
        if (!knex) return 0
        const result = await knex('ia_prompt')
            .where('created_by', userId)
            .where('is_latest', 1)
            .whereIn('share', ['PUBLICO', 'PADRAO'])
            .count('id as count')
            .first()
        return Number(result?.count) || 0
    }

    /**
     * Retorna quantas vezes os prompts do usuário foram executados por terceiros
     */
    static async getUserCommunityUsageCount(userId: number): Promise<number> {
        if (!knex) return 0

        // Buscar IDs dos prompts do usuário
        const userPrompts = await knex('ia_prompt')
            .where('created_by', userId)
            .where('is_latest', 1)
            .select('id')

        if (userPrompts.length === 0) return 0

        // Contar execuções por outros usuários
        let total = 0
        for (const prompt of userPrompts) {
            const count = await knex('ia_generation')
                .where('prompt', `prompt-${prompt.id}`)
                .whereNot('created_by', userId)
                .count('id as count')
                .first()
            total += Number(count?.count) || 0
        }

        return total
    }

    /**
     * Retorna execuções do usuário por mês (últimos 6 meses)
     */
    static async getUserExecutionsByMonth(userId: number, months: number = 6): Promise<mysqlTypes.MonthlyExecutionItem[]> {
        if (!knex) return []

        const dateLimit = new Date()
        dateLimit.setMonth(dateLimit.getMonth() - months)

        const results = await knex('ia_generation')
            .where('created_by', userId)
            // .whereNotNull('prompt_id')
            .andWhere('created_at', '>=', dateLimit.toISOString().split('T')[0] + ' 00:00:00')
            .select(
                knex.raw('EXTRACT(YEAR FROM created_at) as "year"'),
                knex.raw('EXTRACT(MONTH FROM created_at) as "month"'),
                knex.raw('COUNT(id) as "count"')
            )
            .groupByRaw('EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)')
            .orderByRaw('EXTRACT(YEAR FROM created_at) ASC, EXTRACT(MONTH FROM created_at) ASC') as any[]

        return results.map(r => ({
            year: Number(r.year),
            month: Number(r.month),
            count: Number(r.count)
        }))
    }

    /**
     * Verifica os badges do usuário
     */
    static async getUserBadges(userId: number): Promise<mysqlTypes.UserBadges> {
        if (!knex) {
            return {
                inicipiante: false,
                powerUser: false,
                criador: false,
                influenciador: false,
                cincoEstrelas: false,
                curador: false,
                popular: false
            }
        }

        // Badge: Iniciante - Executou pelo menos 1 prompt
        const hasExecution = await knex('ia_generation')
            .where('created_by', userId)
            // .whereNotNull('prompt_id')
            .first()
        const inicipiante = !!hasExecution

        // Badge: Power User - 100+ execuções
        const totalExec = await this.getUserTotalExecutions(userId)
        const powerUser = totalExec >= STATS_CONFIG.MIN_EXECUCOES_POWER_USER

        // Badge: Criador - Criou pelo menos 1 prompt público
        const hasPublicPrompt = await knex('ia_prompt')
            .where('created_by', userId)
            .where('is_latest', 1)
            .whereIn('share', ['PUBLICO', 'PADRAO'])
            .first()
        const criador = !!hasPublicPrompt

        // Badge: Influenciador - Prompts executados 50+ vezes por terceiros
        const communityUsage = await this.getUserCommunityUsageCount(userId)
        const influenciador = communityUsage >= STATS_CONFIG.MIN_EXECUCOES_INFLUENCIADOR

        // Badge: Cinco Estrelas - Recebeu avaliação 5 estrelas
        const hasFiveStars = await knex('ia_prompt_rating as r')
            .join('ia_prompt as p', 'p.base_id', 'r.prompt_base_id')
            .where('p.created_by', userId)
            .where('r.stars', 5)
            .first()
        const cincoEstrelas = !!hasFiveStars

        // Badge: Curador - Avaliou 20+ prompts da comunidade
        const ratingsGiven = await knex('ia_prompt_rating')
            .where('user_id', userId)
            .count('id as count')
            .first()
        const curador = Number(ratingsGiven?.count) >= STATS_CONFIG.MIN_AVALIACOES_CURADOR

        // Badge: Popular - Prompt favoritado por 10+ pessoas
        const userPromptBaseIds = await knex('ia_prompt')
            .where('created_by', userId)
            .where('is_latest', 1)
            .select('base_id')

        let popular = false
        if (userPromptBaseIds.length > 0) {
            const baseIds = userPromptBaseIds.map(p => p.base_id).filter(Boolean)
            if (baseIds.length > 0) {
                const favoriteCount = await knex('ia_favorite')
                    .whereIn('prompt_id', baseIds)
                    .select('prompt_id')
                    .groupBy('prompt_id')
                    .havingRaw('COUNT(*) >= ?', [STATS_CONFIG.MIN_FAVORITOS_POPULAR])
                    .first()
                popular = !!favoriteCount
            }
        }

        return {
            inicipiante,
            powerUser,
            criador,
            influenciador,
            cincoEstrelas,
            curador,
            popular
        }
    }

    /**
     * Retorna estatísticas dos prompts criados pelo usuário
     */
    static async getMyPromptsStats(userId: number): Promise<mysqlTypes.MyPromptStatsItem[]> {
        if (!knex) return []

        // Buscar prompts do usuário
        const userPrompts = await knex('ia_prompt')
            .where('created_by', userId)
            .where('is_latest', 1)
            .whereIn('share', ['PUBLICO', 'PADRAO'])
            .select('id', 'base_id', 'name')

        const result: mysqlTypes.MyPromptStatsItem[] = []

        for (const prompt of userPrompts) {
            // Contar execuções por outros
            const execCount = await knex('ia_generation')
                .where('prompt', `prompt-${prompt.id}`)
                .whereNot('created_by', userId)
                .count('id as count')
                .first()

            // Buscar ratings
            const ratingStats = await knex('ia_prompt_rating')
                .where('prompt_base_id', prompt.base_id)
                .select(
                    knex.raw('AVG(stars) as avgStars'),
                    knex.raw('COUNT(*) as totalRatings')
                )
                .first() as any

            result.push({
                promptBaseId: prompt.base_id,
                promptName: prompt.name,
                executionsByOthers: Number(execCount?.count) || 0,
                avgStars: ratingStats?.avgStars ? Number(Number(ratingStats.avgStars).toFixed(1)) : null,
                totalRatings: Number(ratingStats?.totalRatings) || 0
            })
        }

        return result.sort((a, b) => b.executionsByOthers - a.executionsByOthers)
    }

    /**
     * Retorna todas as estatísticas do usuário
     */
    static async getUserStats(userId: number): Promise<mysqlTypes.UserStats> {
        const [totalExecutions, promptsCreatedCount, communityUsageCount, executionsByMonth, badges, myPromptsStats] = await Promise.all([
            this.getUserTotalExecutions(userId),
            this.getUserPromptsCreatedCount(userId),
            this.getUserCommunityUsageCount(userId),
            this.getUserExecutionsByMonth(userId),
            this.getUserBadges(userId),
            this.getMyPromptsStats(userId)
        ])

        const hoursSaved = (totalExecutions * STATS_CONFIG.TEMPO_MEDIO_ECONOMIA_POR_EXECUCAO_MINUTOS) / 60

        return {
            userId,
            totalExecutions,
            hoursSaved: Number(hoursSaved.toFixed(1)),
            promptsCreatedCount,
            communityUsageCount,
            executionsByMonth,
            badges,
            myPromptsStats
        }
    }
}
