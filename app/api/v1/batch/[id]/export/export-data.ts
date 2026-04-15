import { BatchDao, PromptDao } from "@/lib/db/dao"
import { assertApiUser } from "@/lib/user"
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/utils/api-error'

export type ExportRow = { processNumber: string } & Record<string, unknown>

/**
 * Extracts structured output rows for a batch.
 * Only works for batches whose main prompt produces structured output (json_schema).
 * Returns one row per process, with processNumber + all fields from the JSON output.
 */
export async function extractBatchData(batchId: number): Promise<{ rows: ExportRow[], batchName: string }> {
    await assertApiUser()

    const owns = await BatchDao.assertBatchOwnership(batchId)
    if (!owns) throw new ForbiddenError()

    const batch = await BatchDao.getBatchSummary(batchId)
    if (!batch) throw new NotFoundError('Lote não encontrado')

    // Resolve the main prompt
    const promptBaseId = batch.prompt_base_id
    if (!promptBaseId) throw new BadRequestError('Este lote não possui um prompt principal definido')

    const promptLatestId = batch.prompt_latest_id
    const prompt = promptLatestId ? await PromptDao.retrievePromptById(promptLatestId) : undefined
    if (!prompt?.content?.json_schema && !prompt?.content?.prompt?.includes('## FIELDS')) {
        throw new BadRequestError('O prompt principal deste lote não produz saída estruturada (JSON)')
    }

    // Generations store "prompt-{version_id}". Since the prompt may have been updated,
    // we need to match against ALL version IDs sharing the same base_id.
    const allVersionIds = await PromptDao.retrieveVersionIdsByBaseId(promptBaseId)
    const promptKinds = new Set(allVersionIds.map(id => `prompt-${id}`))

    // Retrieve all dossiers in the batch
    const dossiers = await BatchDao.retrieveBatchDossiers(batchId)

    const rows: ExportRow[] = []
    for (const dossier of dossiers) {
        const generations = await BatchDao.retrieveGenerationByBatchDossierId(dossier.batch_dossier_id)
        // Find the generation from any version of the main prompt
        const mainGen = generations.find(g => promptKinds.has(g.prompt))
        if (!mainGen?.generation) continue

        try {
            const parsed = JSON.parse(mainGen.generation)
            rows.push({ processNumber: dossier.dossier_code, ...parsed })
        } catch {
            // Skip rows with invalid JSON
        }
    }

    return { rows, batchName: batch.name }
}

/**
 * Flatten an object for CSV: nested objects/arrays become JSON strings.
 */
export function flattenForCsv(obj: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
            result[key] = ''
        } else if (typeof value === 'object') {
            result[key] = JSON.stringify(value)
        } else {
            result[key] = String(value)
        }
    }
    return result
}

/**
 * Build CSV string from rows.
 */
export function buildCsv(rows: ExportRow[]): string {
    if (!rows.length) return ''

    // Collect all unique keys across all rows, preserving order (processNumber first)
    const keySet = new Set<string>(['processNumber'])
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            keySet.add(key)
        }
    }
    const headers = Array.from(keySet)

    const escapeCsv = (value: string) => {
        if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
            return `"${value.replace(/"/g, '""')}"`
        }
        return value
    }

    const lines = [headers.map(escapeCsv).join(',')]
    for (const row of rows) {
        const flat = flattenForCsv(row)
        lines.push(headers.map(h => {
            const val = flat[h] ?? ''
            if (h === 'processNumber' && val) return `="${val}"`
            return escapeCsv(val)
        }).join(','))
    }
    return lines.join('\r\n')
}
