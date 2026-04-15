/**
 * Shared utilities for sync providers.
 * 
 * Extracts common logic (file parsing, slug derivation, content hashing)
 * so that LocalProvider, GitHubProvider, and GitLabProvider can all reuse it.
 */
import path from 'path'
import crypto from 'crypto'
import { ParsedPrompt } from '../types'
import { parsePromptMarkdown } from '../parse-prompt-md'

/** A raw file read from any source (filesystem, tarball, API, etc.) */
export interface RawFile {
    /** Relative path within the library (e.g., 'analise-completa.md') */
    relativePath: string
    /** Full text content of the file */
    content: string
}

/**
 * Derive a slug from a relative path.
 * e.g., 'admissibilidade-de-recurso/pedidos-viabilidade-recurso.md' -> 'pedidos-viabilidade-recurso'
 * e.g., 'analise-completa.md' -> 'analise-completa'
 */
export function slugFromPath(relativePath: string): string {
    return path.basename(relativePath, '.md')
}

/**
 * Parse an array of raw .md files into ParsedPrompt objects.
 * Files without a valid uuid in METADATA are silently skipped.
 */
export function parseFiles(files: RawFile[]): ParsedPrompt[] {
    const prompts: ParsedPrompt[] = []
    for (const file of files) {
        const slug = slugFromPath(file.relativePath)
        const parsed = parsePromptMarkdown(slug, file.content, file.relativePath)
        if (parsed) {
            prompts.push(parsed)
        }
    }
    return prompts
}

/**
 * Compute a SHA-256 content hash (first 16 hex chars) for versioning.
 * Used by LocalProvider where there is no commit SHA available.
 */
export function computeContentHash(prompts: ParsedPrompt[]): string {
    const hash = crypto.createHash('sha256')
    for (const p of prompts.sort((a, b) => a.uuid.localeCompare(b.uuid))) {
        hash.update(p.uuid)
        hash.update(p.systemPrompt || '')
        hash.update(p.prompt || '')
        hash.update(p.jsonSchema || '')
        hash.update(p.format || '')
    }
    return hash.digest('hex').substring(0, 16)
}
