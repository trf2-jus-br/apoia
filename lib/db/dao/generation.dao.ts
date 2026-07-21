import knex from '../knex'
import * as mysqlTypes from '../mysql-types'
import { UserDao } from './user.dao'
import { getId } from './utils'

export class GenerationDao {
    static async retrieveIAGeneration(data: mysqlTypes.IAGeneration): Promise<mysqlTypes.IAGenerated | undefined> {
        if (!knex) return
        const { model, prompt, sha256, attempt } = data
        const sql = knex('ia_generation').select<mysqlTypes.IAGenerated>('*').whereNull('evaluation_id').where({
            model,
            prompt,
            sha256,
        })
        sql.whereNot('generation', '')
        sql.whereNotNull('generation')
        if (attempt) {
            sql.where({ attempt })
        } else {
            sql.whereNull('attempt')
        }
        const result = await sql.first()
        return result
    }

    static async insertIAGeneration(data: mysqlTypes.IAGeneration): Promise<mysqlTypes.IAGenerated | undefined> {
        if (!knex) return
        if (!data?.generation) throw new Error('Não é possível armazenar um resultado de IA vazio')
        const created_by = await UserDao.getCurrentUserId()
        const prompt_payload = null
        const {
            // prompt_payload, 
            model, prompt, sha256, generation, attempt,
            dossier_id, document_id,
            cached_input_tokens, input_tokens, output_tokens, reasoning_tokens, approximate_cost } = data
        
        // Use prompt_id from caller if provided; fallback to regex extraction for legacy 'prompt-X' format
        let prompt_id: number | null = data.prompt_id ?? null
        if (!prompt_id) {
            const promptMatch = /^prompt-(\d+)$/.exec(prompt)
            if (promptMatch) {
                const extractedId = parseInt(promptMatch[1], 10)
                const promptExists = await knex('ia_prompt').where('id', extractedId).first()
                if (promptExists) {
                    prompt_id = extractedId
                }
            }
        }

        const execution_id: string | null = data.execution_id ?? null
        const aggregator_prompt_id: number | null = data.aggregator_prompt_id ?? null
        
        const [inserted] = await knex('ia_generation').insert({
            model, prompt, sha256, prompt_payload, generation, attempt,
            dossier_id, document_id,
            cached_input_tokens, input_tokens, output_tokens, reasoning_tokens, approximate_cost, created_by,
            prompt_id, execution_id, aggregator_prompt_id
        }).returning('id')
        const result = await knex('ia_generation').select<mysqlTypes.IAGenerated>('*').where('id', getId(inserted)).first()
        return result
    }

    static async evaluateIAGeneration(user_id: number, generation_id: number, evaluation_id: number, evaluation_descr: string | null): Promise<boolean | undefined> {
        if (!knex) return
        await knex('ia_generation').update({
            evaluation_user_id: user_id,
            evaluation_id,
            evaluation_descr
        }).where({ id: generation_id })
        return true
    }

    // Estatísticas de avaliações negativas (thumbs-down) para o painel /admin/evaluations.
    // Observação: uma geração avaliada sai do cache e pode ser regenerada, criando novas
    // linhas; por isso as taxas são sobre linhas de ia_generation, não gerações distintas.
    static async retrieveEvaluationStats(params: mysqlTypes.EvaluationStatsParams): Promise<mysqlTypes.EvaluationStatsResult> {
        const empty: mysqlTypes.EvaluationStatsResult = {
            summary: { totalGenerations: 0, totalEvaluations: 0, evaluationRate: null, topReason: null },
            byReason: [], byDay: [], byModel: [], byPrompt: [], recent: [],
            availableModels: [], availablePrompts: [],
        }
        if (!knex) return empty

        const isPg = knex.client.config.client === 'pg'
        const dayExpr = isPg ? 'g.created_at::date' : 'DATE(g.created_at)'

        const applyFilters = (query: any) => {
            // join com ia_prompt para permitir filtro por nome do prompt (agrupa versões)
            query.leftJoin('ia_prompt as p', 'p.id', 'g.prompt_id')
            if (params.startDate) query.andWhere('g.created_at', '>=', params.startDate + ' 00:00:00')
            if (params.endDate) query.andWhere('g.created_at', '<=', params.endDate + ' 23:59:59')
            if (params.model) query.andWhere('g.model', params.model)
            if (params.prompt) query.andWhereRaw('COALESCE(p.name, g.prompt) = ?', [params.prompt])
            return query
        }

        // Totais gerais (avaliações e gerações no período/filtro)
        const totals: any = await applyFilters(knex('ia_generation as g'))
            .select(
                knex.raw('COUNT(*) as generations'),
                knex.raw('COUNT(g.evaluation_id) as evaluations'),
            )
            .first()
        const totalGenerations = Number(totals?.generations) || 0
        const totalEvaluations = Number(totals?.evaluations) || 0

        // Por motivo
        const reasonRows: any[] = await applyFilters(knex('ia_generation as g'))
            .leftJoin('ia_evaluation as e', 'e.id', 'g.evaluation_id')
            .select('g.evaluation_id', 'e.descr as reason')
            .count('* as evaluations')
            .whereNotNull('g.evaluation_id')
            .groupBy('g.evaluation_id', 'e.descr')
            .orderBy('evaluations', 'desc')
        const byReason: mysqlTypes.EvaluationByReasonRow[] = reasonRows.map(r => ({
            evaluation_id: Number(r.evaluation_id),
            reason: r.reason || `Motivo ${r.evaluation_id}`,
            evaluations: Number(r.evaluations),
        }))

        // Por dia (gerações e avaliações)
        const dayRows: any[] = await applyFilters(knex('ia_generation as g'))
            .select(knex.raw(`${dayExpr} as day`))
            .select(
                knex.raw('COUNT(*) as generations'),
                knex.raw('COUNT(g.evaluation_id) as evaluations'),
            )
            .groupByRaw(dayExpr)
            .orderByRaw(`${dayExpr} asc`)
        const byDay: mysqlTypes.EvaluationByDayRow[] = dayRows.map(r => ({
            day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10),
            generations: Number(r.generations),
            evaluations: Number(r.evaluations),
        }))

        // Por modelo
        const modelRows: any[] = await applyFilters(knex('ia_generation as g'))
            .select('g.model')
            .select(
                knex.raw('COUNT(*) as generations'),
                knex.raw('COUNT(g.evaluation_id) as evaluations'),
            )
            .groupBy('g.model')
            .orderBy('evaluations', 'desc')
        // Motivo mais frequente por modelo
        const modelReasonRows: any[] = await applyFilters(knex('ia_generation as g'))
            .leftJoin('ia_evaluation as e', 'e.id', 'g.evaluation_id')
            .select('g.model', 'e.descr as reason')
            .count('* as evaluations')
            .whereNotNull('g.evaluation_id')
            .groupBy('g.model', 'e.descr')
        const topReasonByModel = new Map<string, { reason: string, evaluations: number }>()
        for (const r of modelReasonRows) {
            const current = topReasonByModel.get(r.model)
            if (!current || Number(r.evaluations) > current.evaluations)
                topReasonByModel.set(r.model, { reason: r.reason || 'Outros', evaluations: Number(r.evaluations) })
        }
        const byModel: mysqlTypes.EvaluationByModelRow[] = modelRows.map(r => {
            const generations = Number(r.generations)
            const evaluations = Number(r.evaluations)
            return {
                model: r.model,
                generations,
                evaluations,
                evaluationRate: generations > 0 ? evaluations / generations : null,
                topReason: topReasonByModel.get(r.model)?.reason ?? null,
            }
        })

        // Por prompt (agrupa versões pelo nome; fallback para a key gravada em g.prompt)
        const promptRows: any[] = await applyFilters(knex('ia_generation as g'))
            .select(knex.raw("COALESCE(p.name, g.prompt) as prompt_name"))
            .select(
                knex.raw('COUNT(*) as generations'),
                knex.raw('COUNT(g.evaluation_id) as evaluations'),
                knex.raw('MIN(g.prompt_id) as prompt_id'),
            )
            .groupByRaw('COALESCE(p.name, g.prompt)')
            .orderBy('evaluations', 'desc')
        const byPrompt: mysqlTypes.EvaluationByPromptRow[] = promptRows.map(r => {
            const generations = Number(r.generations)
            const evaluations = Number(r.evaluations)
            return {
                prompt_id: r.prompt_id != null ? Number(r.prompt_id) : null,
                prompt_name: r.prompt_name,
                generations,
                evaluations,
                evaluationRate: generations > 0 ? evaluations / generations : null,
            }
        })

        // Últimas avaliações (detalhe)
        const recentRows: any[] = await applyFilters(knex('ia_generation as g'))
            .leftJoin('ia_evaluation as e', 'e.id', 'g.evaluation_id')
            .leftJoin('ia_user as eu', 'eu.id', 'g.evaluation_user_id')
            .leftJoin('ia_dossier as d', 'd.id', 'g.dossier_id')
            .select(
                'g.id',
                'g.created_at',
                knex.raw("COALESCE(p.name, g.prompt) as prompt_name"),
                'g.model',
                'e.descr as reason',
                'g.evaluation_descr',
                'eu.name as evaluator_name',
                'eu.username as evaluator_username',
                'd.code as dossier_code',
            )
            .whereNotNull('g.evaluation_id')
            .orderBy('g.created_at', 'desc')
            .limit(50)
        const recent: mysqlTypes.EvaluationListRow[] = recentRows.map(r => ({
            id: Number(r.id),
            created_at: new Date(r.created_at),
            prompt_name: r.prompt_name,
            model: r.model,
            reason: r.reason ?? null,
            evaluation_descr: r.evaluation_descr ?? null,
            evaluator_name: r.evaluator_name ?? null,
            evaluator_username: r.evaluator_username ?? null,
            dossier_code: r.dossier_code ?? null,
        }))

        // Opções dos filtros: modelos e prompts que já receberam avaliação (sem filtro de data)
        const modelOptions: any[] = await knex('ia_generation as g')
            .distinct('g.model')
            .whereNotNull('g.evaluation_id')
            .orderBy('g.model', 'asc')
        const promptOptions: any[] = await knex('ia_generation as g')
            .leftJoin('ia_prompt as p', 'p.id', 'g.prompt_id')
            .select(knex.raw("COALESCE(p.name, g.prompt) as name"))
            .whereNotNull('g.evaluation_id')
            .groupByRaw('COALESCE(p.name, g.prompt)')
            .orderBy('name', 'asc')

        return {
            summary: {
                totalGenerations,
                totalEvaluations,
                evaluationRate: totalGenerations > 0 ? totalEvaluations / totalGenerations : null,
                topReason: byReason[0]?.reason ?? null,
            },
            byReason,
            byDay,
            byModel,
            byPrompt,
            recent,
            availableModels: modelOptions.map(r => r.model),
            availablePrompts: promptOptions.map(r => r.name),
        }
    }

    static async retrieveAIGenerationsReport(params: { court_id?: number, startDate?: string, endDate?: string, limit?: number }): Promise<mysqlTypes.AIGenerationReportRow[]> {
        if (!knex) return []
        const { court_id, startDate, endDate, limit = 5000 } = params

        const query = knex('ia_generation as g')
            .leftJoin('ia_user as u', 'u.id', 'g.created_by')
            .leftJoin('ia_dossier as d', 'd.id', 'g.dossier_id')
            .leftJoin('ia_prompt as p', 'p.id', 'g.prompt_id')
            .select(
                knex.raw('g.id as id'),
                knex.raw('g.created_at as created_at'),
                knex.raw('u.id as user_id'),
                knex.raw('u.name as user_name'),
                knex.raw('u.username as username'),
                knex.raw('u.court_id as court_id'),
                knex.raw('g.prompt as prompt_key'),
                knex.raw('p.name as prompt_name'),
                knex.raw('g.model as model'),
                knex.raw('d.code as dossier_code'),
                knex.raw('COALESCE(g.cached_input_tokens, 0) as cached_input_tokens'),
                knex.raw('COALESCE(g.input_tokens, 0) as input_tokens'),
                knex.raw('COALESCE(g.output_tokens, 0) as output_tokens'),
                knex.raw('COALESCE(g.reasoning_tokens, 0) as reasoning_tokens'),
                knex.raw('COALESCE(g.approximate_cost, 0) as approximate_cost')
            )

        if (court_id) {
            query.where('u.court_id', court_id)
        }
        if (startDate) {
            query.andWhere('g.created_at', '>=', startDate + ' 00:00:00')
        }
        if (endDate) {
            query.andWhere('g.created_at', '<=', endDate + ' 23:59:59')
        }

        query.orderBy('g.created_at', 'desc')
        query.limit(limit)

        const rows: any[] = await query

        return rows.map(r => {
            // Use prompt_name from JOIN, fallback to prompt_key
            const promptName = r.prompt_name || r.prompt_key

            const cachedTokens = Number(r.cached_input_tokens) || 0
            const inputTokens = Number(r.input_tokens) || 0
            const outputTokens = Number(r.output_tokens) || 0
            const reasoningTokens = Number(r.reasoning_tokens) || 0

            return {
                id: Number(r.id),
                created_at: new Date(r.created_at),
                user_id: r.user_id ? Number(r.user_id) : null,
                user_name: r.user_name ?? null,
                username: r.username ?? null,
                court_id: r.court_id ? Number(r.court_id) : null,
                prompt_key: r.prompt_key,
                prompt_name: promptName,
                model: r.model,
                dossier_code: r.dossier_code ?? null,
                cached_input_tokens: cachedTokens || null,
                input_tokens: inputTokens || null,
                output_tokens: outputTokens || null,
                reasoning_tokens: reasoningTokens || null,
                total_tokens: cachedTokens + inputTokens + outputTokens + reasoningTokens,
                approximate_cost: r.approximate_cost ? Number(r.approximate_cost) : null,
            }
        })
    }
}
