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
import { PieceStrategy } from '../proc/combinacoes'

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
const targetLookup = buildEnumLookup(Target)
const scopeLookup = buildEnumLookup(Scope)
const instanceLookup = buildEnumLookup(Instance)
const matterLookup = buildEnumLookup(Matter)
const pieceStrategyLookup = buildEnumLookup(PieceStrategy)

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
 * Regex that splits a prompt .md into its sections.
 * Must match the headings: METADATA, SYSTEM PROMPT, PROMPT, JSON SCHEMA, FORMAT
 */
const SECTION_REGEX = /(?:^# (?<tag>METADATA|SYSTEM PROMPT|PROMPT|JSON SCHEMA|FORMAT)\s*)$/gms

/**
 * Parse a markdown string (with # METADATA, # SYSTEM PROMPT, etc.) into a ParsedPrompt.
 * 
 * @param slug - The slug derived from the filename (e.g., 'analise-completa')
 * @param md - The raw markdown content
 * @param relativePath - The relative file path within the library
 * @returns A ParsedPrompt object, or null if the file has no METADATA uuid
 */
export function parsePromptMarkdown(slug: string, md: string, relativePath: string): ParsedPrompt | null {
    // Split by headings into sections
    const parts = md.split(SECTION_REGEX).reduce((acc, part, index, array) => {
        if (index % 2 === 0) {
            const tag = array[index - 1]?.trim()
            if (tag) {
                const key = tag.toLowerCase().replace(/\s+/g, '_')
                acc[key] = part.trim()
            }
        }
        return acc
    }, {} as Record<string, string>)

    const { metadata: metadataRaw, system_prompt, prompt, json_schema, format } = parts

    // Parse METADATA as YAML
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
        // Files without uuid in METADATA are skipped (e.g., salvaguardas.md, sistema.md)
        return null
    }

    // Normalize and validate enum fields — accept canonical (OCULTO) or slug (oculto) form
    if (metadata.share != null) {
        const resolved = resolveEnum(metadata.share, shareLookup, 'share', relativePath)
        if (resolved) metadata.share = resolved
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
