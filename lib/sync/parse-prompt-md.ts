/**
 * Parse a prompt markdown file into a ParsedPrompt structure.
 * 
 * This reuses the same section regex used by promptDefinitionFromMarkdown in
 * lib/ai/prompt.ts, but additionally extracts the uuid from the METADATA section.
 */
import yamlps from 'js-yaml'
import { ParsedPrompt, WorkflowRef } from './types'
import { slugify } from '../utils/utils'
import { Share, Target, Scope, Instance, Matter } from '../proc/process-types'
import { PieceStrategy, Plugin, T, FaseProcessual } from '../proc/combinacoes'
import { normalizeModelProfile } from '../ai/model-types'
import { Mode } from '../ai/prompt-types'

/**
 * Build a lookup map that accepts both the canonical form (e.g. 'MAIS_RELEVANTES')
 * and the slugified form (e.g. 'mais-relevantes'), both resolving to the canonical.
 * This makes enum fields in markdown frontmatter case/format-insensitive.
 */
function buildEnumLookup(enumObj: Record<string, any>): Map<string, string> {
    const map = new Map<string, string>()
    for (const key of Object.keys(enumObj)) {
        map.set(key, key)          // canonical → canonical  (MAIS_RELEVANTES)
        map.set(slugify(key), key) // slug → canonical       (mais-relevantes)
    }
    return map
}

const shareLookup = buildEnumLookup(Share)
const modeLookup = buildEnumLookup(Mode)
const targetLookup = buildEnumLookup(Target)
const scopeLookup = buildEnumLookup(Scope)
const instanceLookup = buildEnumLookup(Instance)
const matterLookup = buildEnumLookup(Matter)
const pieceStrategyLookup = buildEnumLookup(PieceStrategy)
const pieceDescrLookup = buildEnumLookup(T)
const faseProcessualLookup = buildEnumLookup(FaseProcessual)

/**
 * Build a lookup that resolves to enum **values** instead of keys.
 * Needed for Plugin where DB/runtime uses the value form (e.g. 'Triagem').
 */
function buildEnumValueLookup(enumObj: Record<string, string>): Map<string, string> {
    const map = new Map<string, string>()
    for (const [key, value] of Object.entries(enumObj)) {
        map.set(key, value)           // TRIAGEM → Triagem
        map.set(slugify(key), value)  // triagem → Triagem
        map.set(value, value)         // Triagem → Triagem
    }
    return map
}
const pluginLookup = buildEnumValueLookup(Plugin)

/**
 * Resolve a single string value against an enum lookup map.
 * Accepts canonical or slugified form. Logs a warning and returns null if unknown.
 */
function resolveEnum(value: any, lookup: Map<string, string>, fieldName: string, source: string): string | null {
    if (value == null) return null
    const str = String(value)
    const resolved = lookup.get(str) ?? lookup.get(str.toLowerCase())
    if (!resolved) {
        console.warn(`[sync] '${source}': valor inválido '${str}' para o campo '${fieldName}'`)
        return null
    }
    return resolved
}

/**
 * Resolve an array of enum values. Filters out any unrecognized entries.
 */
function resolveEnumArray(values: any, lookup: Map<string, string>, fieldName: string, source: string): string[] | null {
    if (!Array.isArray(values)) return null
    const resolved = values
        .map((v: any) => resolveEnum(v, lookup, fieldName, source))
        .filter((v): v is string => v !== null)
    return resolved.length > 0 ? resolved : null
}

/**
 * Normalize the `summary` metadata field to 'SIM' or 'NAO'.
 * YAML may parse boolean-like values (true/false, yes/no) into JS booleans,
 * so we handle boolean, string, and case-insensitive forms.
 */
function normalizeSummary(value: any): string {
    if (typeof value === 'boolean') return value ? 'SIM' : 'NAO'
    const str = String(value).trim().toUpperCase()
    if (['SIM', 'TRUE', 'YES', '1'].includes(str)) return 'SIM'
    return 'NAO'
}

/**
 * Regex that splits a prompt .md body into its sections.
 * Must match the headings: SYSTEM PROMPT, PROMPT, JSON SCHEMA, FORMAT
 */
const SECTION_REGEX = /(?:^# (?<tag>SYSTEM PROMPT|PROMPT|JSON SCHEMA|FORMAT)\s*)$/gms

/**
 * Regex that extracts YAML front matter from the beginning of a file.
 * Matches --- delimiters and captures the YAML content between them.
 */
const FRONT_MATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

/**
 * Parse a markdown string (with YAML front matter and # SYSTEM PROMPT, etc.) into a ParsedPrompt.
 * 
 * @param slug - The slug derived from the filename (e.g., 'analise-completa')
 * @param md - The raw markdown content
 * @param relativePath - The relative file path within the library
 * @returns A ParsedPrompt object, or null if the file has no uuid in front matter
 */
export function parsePromptMarkdown(slug: string, md: string, relativePath: string): ParsedPrompt | null {
    // Extract YAML front matter
    const frontMatterMatch = md.match(FRONT_MATTER_REGEX)
    let metadataRaw: string | null = null
    let bodyMd = md
    if (frontMatterMatch) {
        metadataRaw = frontMatterMatch[1]
        bodyMd = md.slice(frontMatterMatch[0].length)
    }

    // Parse front matter as YAML
    let metadata: Record<string, any> = {}
    if (metadataRaw) {
        try {
            metadata = (yamlps.load(metadataRaw) as Record<string, any>) || {}
        } catch {
            metadata = {}
        }
    }

    const uuid = metadata.uuid as string
    if (!uuid) {
        // Files without uuid in front matter are skipped (e.g., salvaguardas.md, sistema.md)
        return null
    }

    // Split body by section headings
    const parts = bodyMd.split(SECTION_REGEX).reduce((acc, part, index, array) => {
        if (index % 2 === 0) {
            const tag = array[index - 1]?.trim()
            if (tag) {
                const key = tag.toLowerCase().replace(/\s+/g, '_')
                acc[key] = part.trim()
            }
        }
        return acc
    }, {} as Record<string, string>)

    const { system_prompt, prompt, json_schema, format } = parts

    // Normalize and validate enum fields — accept canonical (OCULTO) or slug (oculto) form
    if (metadata.share != null) {
        const resolved = resolveEnum(metadata.share, shareLookup, 'share', relativePath)
        if (resolved) metadata.share = resolved
    }
    if (metadata.mode !== undefined && metadata.mode !== null) {
        const resolved = resolveEnum(metadata.mode, modeLookup, 'mode', relativePath)
        if (resolved) metadata.mode = resolved
    }
    if (metadata.target != null) {
        const resolved = resolveEnum(metadata.target, targetLookup, 'target', relativePath)
        if (resolved) metadata.target = resolved
    }
    if (metadata.piece_strategy != null) {
        const resolved = resolveEnum(metadata.piece_strategy, pieceStrategyLookup, 'piece_strategy', relativePath)
        if (resolved) metadata.piece_strategy = resolved
    }
    if (metadata.scope != null) {
        const resolved = resolveEnumArray(metadata.scope, scopeLookup, 'scope', relativePath)
        if (resolved) metadata.scope = resolved
    }
    if (metadata.instance != null) {
        const resolved = resolveEnumArray(metadata.instance, instanceLookup, 'instance', relativePath)
        if (resolved) metadata.instance = resolved
    }
    if (metadata.matter != null) {
        const resolved = resolveEnumArray(metadata.matter, matterLookup, 'matter', relativePath)
        if (resolved) metadata.matter = resolved
    }
    if (metadata.plugins != null) {
        const resolved = resolveEnumArray(metadata.plugins, pluginLookup, 'plugins', relativePath)
        if (resolved) metadata.plugins = resolved
        else delete metadata.plugins
    }
    if (metadata.piece_descr != null) {
        const resolved = resolveEnumArray(metadata.piece_descr, pieceDescrLookup, 'piece_descr', relativePath)
        if (resolved) metadata.piece_descr = resolved
        else delete metadata.piece_descr
    }
    if (metadata.phase != null) {
        const resolved = resolveEnumArray(metadata.phase, faseProcessualLookup, 'phase', relativePath)
        if (resolved) metadata.phase = resolved
        else delete metadata.phase
    }
    if (metadata.profile != null) {
        const resolved = normalizeModelProfile(String(metadata.profile))
        if (resolved) metadata.profile = resolved
        else {
            console.warn(`[sync] '${relativePath}': valor inválido '${metadata.profile}' para o campo 'profile'`)
            metadata.__invalid_profile = String(metadata.profile)
            delete metadata.profile
        }
    }
    if (metadata.summary != null) {
        metadata.summary = normalizeSummary(metadata.summary)
    }
    if (metadata.context != null && typeof metadata.context === 'object') {
        if (metadata.context.instance != null) {
            const resolved = resolveEnum(metadata.context.instance, instanceLookup, 'context.instance', relativePath)
            if (resolved) metadata.context.instance = resolved
        }
        if (metadata.context.action != null) {
            metadata.context.action = String(metadata.context.action).replaceAll('-', '_')
        }
    }

    // Parse workflow predecessors/successors from METADATA
    const predecessors = parseWorkflowRefs(metadata.predecessors)
    const successors = parseWorkflowRefs(metadata.successors)

    return {
        uuid,
        slug,
        name: metadata.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        systemPrompt: system_prompt || null,
        prompt: prompt || null,
        jsonSchema: json_schema || null,
        format: format || null,
        template: parts.template || null,
        metadata,
        relativePath,
        ...(predecessors.length > 0 ? { predecessors } : {}),
        ...(successors.length > 0 ? { successors } : {}),
    }
}

/**
 * Parse a YAML array of workflow references into WorkflowRef objects.
 * Supports two formats:
 *   - path: chat              (simple path reference)
 *   - uuid: abc-123           (direct UUID reference)
 *   - path: chat              (with optional: true, condition: ...)
 */
function parseWorkflowRefs(raw: any): WorkflowRef[] {
    if (!Array.isArray(raw)) return []

    return raw.map((item: any) => {
        if (typeof item === 'string') {
            // Short form: just a path string
            return { path: item } as WorkflowRef
        }
        if (typeof item === 'object' && item !== null) {
            const ref: WorkflowRef = {}
            if (item.path) ref.path = String(item.path)
            if (item.uuid) ref.uuid = String(item.uuid)
            if (item.optional) ref.optional = true
            if (item.condition) ref.condition = String(item.condition)
            return ref
        }
        return null
    }).filter(Boolean) as WorkflowRef[]
}
