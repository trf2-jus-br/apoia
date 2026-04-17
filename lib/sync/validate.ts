/**
 * Prompt validation logic (no side-effects).
 * 
 * Used by the /api/v1/sync/validate endpoint to check incoming prompt files
 * without writing to the database. Can be used in CI pipelines to block
 * bad commits before they reach production.
 */
import devLog from '../utils/log'
import { parsePromptMarkdown } from './parse-prompt-md'
import { slugFromPath } from './providers/shared'

/** Validation result for a single file */
export interface FileValidationResult {
    path: string
    valid: boolean
    errors: string[]
    warnings: string[]
}

/** Aggregate validation result */
export interface ValidationResult {
    valid: boolean
    files: FileValidationResult[]
}

/** UUID v4 format regex */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validate a set of prompt files without writing to the database.
 * 
 * Checks:
 *   1. Each file is parseable as a valid prompt markdown
 *   2. UUID is present and in valid format
 *   3. No duplicate UUIDs across files
 *   4. Workflow references resolve within the provided file set
 *   5. Required sections are present (at least PROMPT or SYSTEM PROMPT)
 * 
 * @param files - Array of { path, content } objects
 * @returns Validation results per file and aggregate
 */
export function validatePromptFiles(files: { path: string; content: string }[]): ValidationResult {
    const fileResults: FileValidationResult[] = []
    const uuidToPath = new Map<string, string>()
    const slugToPath = new Map<string, string>()

    // First pass: parse all files, check individual validity
    const parsedFiles: { path: string; parsed: ReturnType<typeof parsePromptMarkdown> }[] = []

    for (const file of files) {
        devLog(`[sync] Validating file: ${file.path}`)
        const result: FileValidationResult = { path: file.path, valid: true, errors: [], warnings: [] }

        if (!file.path.endsWith('.md')) {
            result.warnings.push('File does not have .md extension, skipping')
            fileResults.push(result)
            continue
        }

        const slug = slugFromPath(file.path)
        let parsed: ReturnType<typeof parsePromptMarkdown> = null

        try {
            parsed = parsePromptMarkdown(slug, file.content, file.path)
        } catch (err: any) {
            result.valid = false
            result.errors.push(`Parse error: ${err.message}`)
            fileResults.push(result)
            continue
        }

        if (!parsed) {
            result.valid = false
            result.errors.push('Missing uuid in METADATA section')
            fileResults.push(result)
            continue
        }

        // UUID format check
        if (!UUID_REGEX.test(parsed.uuid)) {
            result.valid = false
            result.errors.push(`Invalid UUID format: '${parsed.uuid}'`)
        }

        // Duplicate UUID check
        const existingPath = uuidToPath.get(parsed.uuid)
        if (existingPath) {
            result.valid = false
            result.errors.push(`Duplicate UUID '${parsed.uuid}' — also used by '${existingPath}'`)
        } else {
            uuidToPath.set(parsed.uuid, file.path)
        }

        // Duplicate slug check (two different files must not produce the same slug)
        const existingSlugPath = slugToPath.get(parsed.slug)
        if (existingSlugPath && existingSlugPath !== file.path) {
            result.valid = false
            result.errors.push(`Duplicate slug '${parsed.slug}' — also produced by '${existingSlugPath}'`)
        }

        // Build slug index for workflow resolution
        slugToPath.set(parsed.slug, file.path)
        const pathWithoutExt = parsed.relativePath.replace(/\.md$/, '')
        if (pathWithoutExt !== parsed.slug) {
            slugToPath.set(pathWithoutExt, file.path)
        }

        // Content presence check
        if (!parsed.systemPrompt && !parsed.prompt) {
            result.warnings.push('No SYSTEM PROMPT or PROMPT section found')
        }

        parsedFiles.push({ path: file.path, parsed })
        fileResults.push(result)
    }

    // Second pass: check workflow references resolve
    for (const { path: filePath, parsed } of parsedFiles) {
        if (!parsed) continue
        const result = fileResults.find(r => r.path === filePath)
        if (!result) continue

        const allRefs = [...(parsed.predecessors || []), ...(parsed.successors || [])]
        for (const ref of allRefs) {
            if (ref.path && !ref.uuid) {
                if (!slugToPath.has(ref.path)) {
                    result.warnings.push(`Workflow reference '${ref.path}' could not be resolved within the file set`)
                }
            }
        }
    }

    const valid = fileResults.every(r => r.valid)
    return { valid, files: fileResults }
}
