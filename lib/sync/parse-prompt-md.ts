/**
 * Parse a prompt markdown file into a ParsedPrompt structure.
 * 
 * This reuses the same section regex used by promptDefinitionFromMarkdown in
 * lib/ai/prompt.ts, but additionally extracts the uuid from the METADATA section.
 */
import yamlps from 'js-yaml'
import { ParsedPrompt } from './types'

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
    }
}
