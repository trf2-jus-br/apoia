import knex from '../knex'
import * as mysqlTypes from '../mysql-types'
import { UserDao } from './user.dao'
import { getId } from './utils'

export class BatchDao {
    // Rewrite all mappings for a batch: delete existing and insert the new set
    static async rewriteBatchFixIndexMap(batch_id: number, pairs: { descr_from: string, descr_to: string }[]): Promise<number> {
        if (!knex) return 0
        return await knex.transaction(async (trx) => {
            await trx('ia_batch_index_map').where({ batch_id }).delete()
            if (!pairs.length) return 0
            const rows = pairs.map(p => ({ batch_id, descr_from: p.descr_from, descr_to: p.descr_to }))
            const inserted = await trx('ia_batch_index_map').insert(rows).returning('id')
            return Array.isArray(inserted) ? inserted.length : (inserted ? 1 : 0)
        })
    }

    static async listBatchFixIndexMap(batch_id: number): Promise<{ descr_from: string, descr_to: string }[]> {
        if (!knex) return []
        const rows = await knex('ia_batch_index_map').select('descr_from', 'descr_to').where({ batch_id }).orderBy('descr_from').orderBy('descr_to')
        return rows as any
    }

    static async retrieveByBatchIdAndEnumId(batch_id: number, enum_id: number): Promise<mysqlTypes.AIBatchIdAndEnumId[]> {
        if (!knex) return []
        const query = knex('ia_batch as b')
            .select<mysqlTypes.AIBatchIdAndEnumId[]>(
            'd.code as dossier_code',
            'd.class_code as dossier_class_code',
            'd.filing_at as dossier_filing_at',
            'ei.id as enum_item_id',
            'ei.descr as enum_item_descr',
            'ei2.descr as enum_item_descr_main',
            'bd.id as batch_dossier_id',
            'bd.footer as batch_dossier_footer',
            )
            .innerJoin('ia_batch_dossier as bd', 'bd.batch_id', 'b.id')
            .innerJoin('ia_dossier as d', 'd.id', 'bd.dossier_id')
            .leftJoin('ia_batch_dossier_enum_item as bdei', 'bdei.batch_dossier_id', 'bd.id')
            .leftJoin('ia_enum_item as ei', 'ei.id', 'bdei.enum_item_id')
            .leftJoin('ia_enum as e', 'e.id', 'ei.enum_id')
            .leftJoin('ia_enum_item as ei2', 'ei2.id', 'ei.enum_item_id_main')
            .where('b.id', batch_id)
            .andWhere(function () {
            this.where('e.id', enum_id).orWhereNull('e.id')
            })
            .orderBy('ei.descr')
            .orderBy('d.code')
        const result = await query
        return result

    }

    static async retrieveCountByBatchIdAndEnumId(batch_id: number, enum_id: number): Promise<mysqlTypes.AICountByBatchIdAndEnumId[]> {
        if (!knex) return []
        const result = await knex('ia_batch as b')
            .select<mysqlTypes.AICountByBatchIdAndEnumId[]>('ei.descr as enum_item_descr', 'ei.hidden', knex.raw('count(distinct bd.id) as count'))
            .join('ia_batch_dossier as bd', 'bd.batch_id', '=', 'b.id')
            .join('ia_dossier as d', 'd.id', '=', 'bd.dossier_id')
            .join('ia_batch_dossier_enum_item as bdei', 'bdei.batch_dossier_id', '=', 'bd.id')
            .join('ia_enum_item as ei', 'ei.id', '=', 'bdei.enum_item_id')
            .join('ia_enum as e', 'e.id', '=', 'ei.enum_id').
            where({ 'b.id': batch_id, 'e.id': enum_id })
            .groupBy('ei.descr', 'ei.hidden')
        // .orderBy(knex.raw('count(distinct bd.id)'), 'desc');
        result.sort((a, b) => a.count - b.count)
        return result
    }

    static async retrieveGenerationByBatchDossierId(batch_dossier_id: number): Promise<mysqlTypes.AIBatchDossierGeneration[]> {
        if (!knex) return []
        const result = knex('ia_batch_dossier_item as bdi')
            .select<mysqlTypes.AIBatchDossierGeneration[]>
                ('bdi.descr',
                'g.generation',
                'g.prompt',
                'd.id as document_id',
                'd.code as document_code'
            )
            .innerJoin('ia_generation as g', 'g.id', 'bdi.generation_id')
            .leftJoin('ia_document as d', 'd.id', 'bdi.document_id')
            .where({
                'bdi.batch_dossier_id': batch_dossier_id
            })
            .orderBy('bdi.seq')
        return result
    }

    static async retrieveBatchDossiers(batch_id: number): Promise<{ batch_dossier_id: number, dossier_code: string }[]> {
        if (!knex) return []
        return knex('ia_batch_dossier as bd')
            .select('bd.id as batch_dossier_id', 'd.code as dossier_code')
            .innerJoin('ia_dossier as d', 'd.id', 'bd.dossier_id')
            .where('bd.batch_id', batch_id)
            .orderBy('d.code')
    }

    static async assertIABatchId(batchName: string): Promise<number> {
        if (!knex) return 0
        const created_by = await UserDao.getCurrentUserId()
        // Prefer batch owned by current user
        let bach = await knex('ia_batch').select('id').where({ name: batchName, created_by }).first()
        if (!bach) {
            // Fallback to any batch with same name (legacy batches without created_by)
            bach = await knex('ia_batch').select('id').where({ name: batchName }).first()
        }
        if (bach) return bach.id
        const [created] = await knex('ia_batch').insert({ name: batchName, created_by }).returning('id')
        return getId(created)
    }

    static async assertIABatchDossierId(batch_id: number, dossier_id: number, footer: string): Promise<number> {
        if (!knex) return 0
        // Check or insert document
        let batch_dossier_id: number | null = null
        const document = await knex('ia_batch_dossier').select('id').where({
            batch_id, dossier_id
        }).first()
        if (document) {
            return document.id as number
        }

        const [inserted] = await knex('ia_batch_dossier').insert({
            batch_id, dossier_id, footer
        }).returning('id')
        return getId(inserted)
    }

    static async deleteIABatchDossierId(batch_id: number, dossier_id: number): Promise<undefined> {
        if (!knex) return
        await knex('ia_batch_dossier').delete().where({ batch_id, dossier_id })
    }

    static async insertIABatchDossierItem(data: mysqlTypes.IABatchDossierItem): Promise<mysqlTypes.IABatchDossierItem | undefined> {
        if (!knex) return
        const { batch_dossier_id, document_id, generation_id, descr, seq } = data
        const [inserted] = await knex('ia_batch_dossier_item').insert({
            batch_dossier_id,
            document_id, generation_id, descr, seq
        }).returning('id')

        const result = await knex('ia_batch_dossier_item').select<mysqlTypes.IABatchDossierItem>('*').where('id', getId(inserted)).first()
        return result
    }

    static async assertIABatchDossierEnumItemId(batch_dossier_id: number, enum_item_id: number): Promise<number> {
        if (!knex) return 0
        // Check or insert document
        const bachItem = await knex('ia_batch_dossier_enum_item').select('id').where({ batch_dossier_id, enum_item_id }).first()
        if (bachItem) return bachItem.id
        const [result] = await knex('ia_batch_dossier_enum_item').insert({
            batch_dossier_id, enum_item_id
        }).returning("id")
        return getId(result)
    }

    static async createBatchWithJobs(params: { name: string, tipo_de_sintese?: string | null, prompt_base_id?: number | null, complete: boolean, numbers: string[] }): Promise<mysqlTypes.IABatch> {
        const userId = await UserDao.getCurrentUserId()
        const { name } = params
        let { tipo_de_sintese, prompt_base_id, complete, numbers } = params
        // Validação de exclusividade
        if ((tipo_de_sintese && prompt_base_id) || (!tipo_de_sintese && !prompt_base_id)) {
            throw new Error('Informe exatamente um entre tipo_de_sintese ou prompt_base_id')
        }
        if (prompt_base_id) {
            tipo_de_sintese = null
        } else {
            prompt_base_id = null
        }
        const insertData: any = { name, created_by: userId, tipo_de_sintese, prompt_base_id, complete, paused: true }
        const [batchIdRet] = await knex('ia_batch').insert(insertData).returning('id')
        const batch_id = getId(batchIdRet)
        const rows = numbers
            .map(n => (n || '').replace(/\D/g, ''))
            .filter(n => n && n.length === 20)
            .map(n => ({ batch_id, dossier_code: n }))
        if (rows.length) await knex('ia_batch_job').insert(rows)
        const batch = await knex('ia_batch').select('*').where({ id: batch_id }).first()
        return batch as mysqlTypes.IABatch
    }

    static async listBatchesForUser(): Promise<mysqlTypes.IABatchSummary[]> {
        const userId = await UserDao.getCurrentUserId()
        // Aggregate counts and cost in a single query per batch
        const batches: any[] = await knex('ia_batch as b')
            .select(
                'b.id', 'b.name', 'b.tipo_de_sintese', 'b.prompt_base_id', 'b.complete', 'b.paused',
                knex.raw('p_latest.id as prompt_latest_id'),
                knex.raw('p_latest.name as prompt_latest_name')
            )
            .leftJoin('ia_prompt as p_latest', function () {
                this.on('p_latest.base_id', '=', 'b.prompt_base_id')
                    .andOn('p_latest.is_latest', knex.raw('?', [true]))
            })
            .where('b.created_by', userId)
            .orderBy('b.created_at', 'desc')
        if (!batches.length) return []
        const batchIds = batches.map(b => b.id)
        const jobs = await knex('ia_batch_job')
            .select('batch_id', 'status')
            .count('* as cnt')
            .whereIn('batch_id', batchIds)
            .groupBy('batch_id', 'status')
        const costs = await knex('ia_batch_job')
            .select('batch_id')
            .sum({ sum: 'cost_sum' })
            .whereIn('batch_id', batchIds)
            .andWhere('status', 'READY')
            .groupBy('batch_id')
        const durations = await knex('ia_batch_job')
            .select('batch_id')
            .avg({ avg: 'duration_ms' })
            .whereIn('batch_id', batchIds)
            .andWhere('status', 'READY')
            .groupBy('batch_id')
        const byId: Record<number, mysqlTypes.IABatchSummary> = {}
        for (const b of batches) {
            byId[b.id] = { id: b.id, name: b.name, tipo_de_sintese: b.tipo_de_sintese, prompt_base_id: b.prompt_base_id, prompt_latest_id: b.prompt_latest_id ?? null, prompt_latest_name: b.prompt_latest_name ?? null, complete: !!b.complete, paused: !!b.paused, totals: { total: 0, pending: 0, running: 0, ready: 0, error: 0 }, spentCost: 0, estimatedTotalCost: 0, avgDurationMs: null, etaMs: null }
        }
        for (const jAny of jobs as any[]) {
            const s = jAny.status as mysqlTypes.IABatchJob['status']
            const cnt = Number(jAny.cnt)
            const agg = byId[jAny.batch_id]
            if (!agg) continue
            agg.totals.total += cnt
            if (s === 'PENDING') agg.totals.pending += cnt
            if (s === 'RUNNING') agg.totals.running += cnt
            if (s === 'READY') agg.totals.ready += cnt
            if (s === 'ERROR') agg.totals.error += cnt
        }
        for (const cAny of costs as any[]) {
            const agg = byId[cAny.batch_id]
            if (!agg) continue
            agg.spentCost = Number(cAny.sum || 0)
        }
        for (const dAny of durations as any[]) {
            const agg = byId[dAny.batch_id]
            if (!agg) continue
            agg.avgDurationMs = dAny.avg != null ? Number(dAny.avg) : null
        }
        // Estimate total cost: avg cost of READY * total jobs
        for (const id of Object.keys(byId)) {
            const agg = byId[Number(id)]
            const ready = Math.max(1, agg.totals.ready)
            const avgCost = agg.spentCost / ready
            agg.estimatedTotalCost = Number.isFinite(avgCost) ? avgCost * agg.totals.total : agg.spentCost
            const remaining = agg.totals.total - agg.totals.ready - agg.totals.error
            agg.etaMs = agg.avgDurationMs ? Math.round(agg.avgDurationMs * Math.max(remaining, 0)) : null
        }
        return Object.values(byId)
    }

    static async getBatchSummary(batch_id: number): Promise<mysqlTypes.IABatchSummary | undefined> {
        const b = await knex('ia_batch as b')
            .select(
                'b.*',
                knex.raw('p_latest.id as prompt_latest_id'),
                knex.raw('p_latest.name as prompt_latest_name')
            )
            .leftJoin('ia_prompt as p_latest', function () {
                this.on('p_latest.base_id', '=', 'b.prompt_base_id')
                    .andOn('p_latest.is_latest', knex.raw('?', [true]))
            })
            .where('b.id', batch_id)
            .first()
        if (!b) return
        const counts = await knex('ia_batch_job')
            .select('status')
            .count('* as cnt')
            .where({ batch_id })
            .groupBy('status')
        // Custo atual: soma de approximate_cost das gerações vinculadas ao lote
        const costRow = await knex('ia_batch_dossier_item as bdi')
            .innerJoin('ia_generation as g', 'g.id', 'bdi.generation_id')
            .innerJoin('ia_batch_dossier as bd', 'bd.id', 'bdi.batch_dossier_id')
            .sum({ sum: 'g.approximate_cost' })
            .where('bd.batch_id', batch_id)
            .first()
        const durRow = await knex('ia_batch_job')
            .avg({ avg: 'duration_ms' })
            .where({ batch_id, status: 'READY' })
            .first()
        const totals = { total: 0, pending: 0, running: 0, ready: 0, error: 0 }
            ; (counts as any[]).forEach(c => {
                const s = c.status as mysqlTypes.IABatchJob['status']
                const cnt = Number(c.cnt)
                totals.total += cnt
                if (s === 'PENDING') totals.pending += cnt
                if (s === 'RUNNING') totals.running += cnt
                if (s === 'READY') totals.ready += cnt
                if (s === 'ERROR') totals.error += cnt
            })
        const spentCost = Number((costRow as any)?.sum || 0)
        const avgDurationMs = (durRow as any)?.avg != null ? Number((durRow as any).avg) : null
        // Média por dossiê (job) pronto, não por item; garante estimado >= atual quando há pendentes
        const readyCount = Math.max(1, totals.ready)
        const avgCost = spentCost / readyCount
        const estimatedTotalCost = Number.isFinite(avgCost) ? avgCost * totals.total : spentCost
        const remaining = totals.total - totals.ready - totals.error
        const etaMs = avgDurationMs ? Math.round(avgDurationMs * Math.max(remaining, 0)) : null
        return { id: b.id, name: b.name, tipo_de_sintese: b.tipo_de_sintese, prompt_base_id: (b as any).prompt_base_id, prompt_latest_id: (b as any).prompt_latest_id ?? null, prompt_latest_name: (b as any).prompt_latest_name ?? null, complete: !!b.complete, paused: !!b.paused, totals, spentCost, estimatedTotalCost, avgDurationMs, etaMs }
    }

    static async backfillJobCost(batch_id: number, job_id: number, dossier_code: string): Promise<number | null> {
        const bd = await BatchDao.findBatchDossierByBatchAndCode(batch_id, dossier_code)
        if (!bd) return null
        const cost = await BatchDao.computeCostSumByBatchDossierId(bd.batch_dossier_id)
        await knex('ia_batch_job').update({ cost_sum: cost, dossier_id: bd.dossier_id }).where({ id: job_id, batch_id })
        return cost
    }

    /**
     * Delete a batch and all related data (jobs, batch dossiers, items and enum item links).
     * Only allowed if the current user is the owner (created_by) of the batch.
     * Returns true if the batch was deleted, false if not found or not authorized.
     */
    static async deleteBatch(batch_id: number): Promise<boolean> {
        if (!knex) throw new Error('DB not ready')
        const currentUserId = await UserDao.getCurrentUserId()
        const batchRow: any = await knex('ia_batch').select('id', 'created_by').where({ id: batch_id }).first()
        if (!batchRow) return false
        if (batchRow.created_by !== currentUserId) return false

        return await knex.transaction(async trx => {
            // Collect batch_dossier ids first
            const batchDossiers = await trx('ia_batch_dossier').select('id').where({ batch_id })
            const bdIds = batchDossiers.map(r => (r as any).id)

            if (bdIds.length) {
                // Delete enum item links referencing batch_dossier
                await trx('ia_batch_dossier_enum_item').whereIn('batch_dossier_id', bdIds).delete()
                // Delete items
                await trx('ia_batch_dossier_item').whereIn('batch_dossier_id', bdIds).delete()
                // Delete batch_dossier
                await trx('ia_batch_dossier').whereIn('id', bdIds).delete()
            }

            // Delete jobs
            await trx('ia_batch_job').where({ batch_id }).delete()
            // Finally delete the batch
            const del = await trx('ia_batch').where({ id: batch_id }).delete()
            return del > 0
        })
    }

    static async listBatchJobs(batch_id: number, status?: mysqlTypes.IABatchJob['status'] | 'all', page?: number, pageSize: number = 10000): Promise<mysqlTypes.IABatchJob[]> {
        const q = knex('ia_batch_job').select('*').where({ batch_id })
        if (status && status !== 'all') q.andWhere('status', status)
        q.orderBy('created_at', 'asc').limit(pageSize).offset(((page || 1) - 1) * pageSize)
        const rows = await q
        return rows as any
    }

    static async setBatchPaused(batch_id: number, paused: boolean): Promise<void> {
        await knex('ia_batch').update({ paused }).where({ id: batch_id })
    }

    static async assertBatchOwnership(batch_id: number): Promise<boolean> {
        const userId = await UserDao.getCurrentUserId()
        const row = await knex('ia_batch').select('id').where({ id: batch_id, created_by: userId }).first()
        return !!row
    }

    static async retryJob(batch_id: number, job_id: number): Promise<void> {
        await knex('ia_batch_job').update({ status: 'PENDING', error_msg: null, started_at: null, finished_at: null, duration_ms: null }).where({ id: job_id, batch_id })
    }

    static async retryAllErrors(batch_id: number): Promise<number> {
        const result = await knex('ia_batch_job')
            .update({ status: 'PENDING', error_msg: null, started_at: null, finished_at: null, duration_ms: null })
            .where({ batch_id, status: 'ERROR' })
        return result || 0
    }

    static async stopJob(batch_id: number, job_id: number): Promise<void> {
        await knex('ia_batch_job').update({ status: 'PENDING', error_msg: null, started_at: null, finished_at: null, duration_ms: null }).where({ id: job_id, batch_id })
    }

    static async addJobs(batch_id: number, numbers: string[]): Promise<number> {
        // Normalize numbers to only digits with length 20 and deduplicate
        const cleaned = numbers
            .map(n => (n || '').replace(/\D/g, ''))
            .filter(n => n && n.length === 20)
        const unique = Array.from(new Set(cleaned))
        if (!unique.length) return 0

        // Exclude numbers that are already present for this batch
        const existingRows = await knex('ia_batch_job')
            .select('dossier_code')
            .where({ batch_id })
            .whereIn('dossier_code', unique)
        const existing = new Set(existingRows.map((r: any) => r.dossier_code))

        const rows = unique
            .filter(n => !existing.has(n))
            .map(n => ({ batch_id, dossier_code: n }))

        if (!rows.length) return 0
        const inserted = await knex('ia_batch_job').insert(rows).returning('id')
        return Array.isArray(inserted) ? inserted.length : (inserted ? 1 : 0)
    }

    static async getErrorsCsv(batch_id: number): Promise<string> {
        const rows = await knex('ia_batch_job').select('dossier_code', 'attempts', 'error_msg', 'started_at', 'finished_at', 'duration_ms').where({ batch_id, status: 'ERROR' }).orderBy('finished_at', 'desc')
        const header = 'dossier_code;attempts;error_msg;started_at;finished_at;duration_ms\n'
        const body = rows.map(r => [r.dossier_code, r.attempts, (r.error_msg || '').replace(/[\r\n]+/g, ' '), r.started_at ? new Date(r.started_at).toISOString() : '', r.finished_at ? new Date(r.finished_at).toISOString() : '', r.duration_ms ?? ''].join(';')).join('\n')
        return header + body + '\n'
    }

    // Delete a job and its batch dossier links (if any), as long as it's not RUNNING
    static async deleteJobDeep(batch_id: number, dossier_code: string): Promise<number> {
        if (!knex) return 0
        return await knex.transaction(async (trx) => {
            // Only allow delete when not RUNNING
            const job = await trx('ia_batch_job').select('id', 'status').where({ batch_id, dossier_code }).first()
            if (!job) return 0
            if ((job as any).status === 'RUNNING') return 0

            // Delete batch_dossier_item -> batch_dossier -> batch_dossier_enum_item
            // Find batch_dossier
            const bd = await trx('ia_batch_dossier as bd')
                .select('bd.id')
                .innerJoin('ia_dossier as d', 'd.id', 'bd.dossier_id')
                .where('bd.batch_id', batch_id)
                .andWhere('d.code', dossier_code)
                .first()
            if (bd) {
                const bdId = (bd as any).id
                await trx('ia_batch_dossier_item').where('batch_dossier_id', bdId).delete()
                await trx('ia_batch_dossier_enum_item').where('batch_dossier_id', bdId).delete()
                await trx('ia_batch_dossier').where('id', bdId).delete()
            }
            // Delete job
            return await trx('ia_batch_job').where({ batch_id, dossier_code }).delete()
        }) as unknown as Promise<number>
    }

    static async deleteJobs(batch_id: number, numbers: string[]): Promise<number> {
        const cleaned = numbers.map(n => (n || '').replace(/\D/g, '')).filter(n => n && n.length === 20)
        if (!cleaned.length) return 0
        let totalDeleted = 0
        for (const code of cleaned) {
            const deleted = await BatchDao.deleteJobDeep(batch_id, code)
            totalDeleted += deleted
        }
        return totalDeleted
    }

    static async findBatchDossierByBatchAndCode(batch_id: number, dossier_code: string): Promise<{ batch_dossier_id: number, dossier_id: number } | undefined> {
        const row = await knex('ia_batch_dossier as bd')
            .select('bd.id as batch_dossier_id', 'd.id as dossier_id')
            .innerJoin('ia_dossier as d', 'd.id', 'bd.dossier_id')
            .where('bd.batch_id', batch_id)
            .andWhere('d.code', dossier_code)
            .first()
        if (!row) return
        return { batch_dossier_id: (row as any).batch_dossier_id, dossier_id: (row as any).dossier_id }
    }

    static async computeCostSumByBatchDossierId(batch_dossier_id: number): Promise<number> {
        const row = await knex('ia_batch_dossier_item as bdi')
            .leftJoin('ia_generation as g', 'g.id', 'bdi.generation_id')
            .where('bdi.batch_dossier_id', batch_dossier_id)
            .sum({ sum: 'g.approximate_cost' })
            .first()
        return Number((row as any)?.sum || 0)
    }

    static async stepBatch(batch_id: number, fnProcess: (job: mysqlTypes.IABatchJob) => Promise<{ status: 'READY' | 'ERROR', error_msg?: string, cost_sum?: number, dossier_id?: number }>, opts?: { job_id?: number, dossier_code?: string }): Promise<mysqlTypes.IABatchJob | undefined> {
        // Find one pending job: if opts.job_id provided, target by id; else if dossier_code provided, target by dossier; otherwise FIFO
        const q = knex('ia_batch_job').select('*').where({ batch_id, status: 'PENDING' })
        if (opts?.job_id) q.andWhere('id', opts.job_id)
        else if (opts?.dossier_code) q.andWhere('dossier_code', opts.dossier_code)
        const job = await q.orderBy('created_at', 'asc').first()
        if (!job) return
        const started_at = new Date()
        await knex('ia_batch_job').update({ status: 'RUNNING', started_at, attempts: knex.raw('attempts + 1') }).where({ id: job.id })
        try {
            const result = await fnProcess(job as mysqlTypes.IABatchJob)
            const finished_at = new Date()
            const duration_ms = finished_at.getTime() - started_at.getTime()
            let cost_sum = result.cost_sum ?? job.cost_sum
            let dossier_id = result.dossier_id ?? job.dossier_id
            if (result.status === 'READY') {
                // Try compute cost and dossier_id from persisted batch_dossier
                const bd = await BatchDao.findBatchDossierByBatchAndCode(batch_id, (job as any).dossier_code)
                if (bd) {
                    dossier_id = bd.dossier_id
                    cost_sum = await BatchDao.computeCostSumByBatchDossierId(bd.batch_dossier_id)
                }
            }
            await knex('ia_batch_job').update({ status: result.status, finished_at, duration_ms, error_msg: result.error_msg || null, cost_sum, dossier_id }).where({ id: job.id })
            await knex('ia_batch').update({ last_activity_at: new Date() }).where({ id: batch_id })
            const updated = await knex('ia_batch_job').select('*').where({ id: job.id }).first()
            return updated as any
        } catch (e) {
            const finished_at = new Date()
            const duration_ms = finished_at.getTime() - started_at.getTime()
            await knex('ia_batch_job').update({ status: 'ERROR', finished_at, duration_ms, error_msg: (e as Error).message || String(e) }).where({ id: job.id })
            await knex('ia_batch').update({ last_activity_at: new Date() }).where({ id: batch_id })
        }
    }
}
