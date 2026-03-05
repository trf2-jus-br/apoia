/**
 * Local filesystem library provider.
 * 
 * Reads prompt .md files and workflow .yaml files from a directory on disk.
 * Used for the built-in prompts shipped with the application (prompts/ directory).
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { OriginProvider, OriginContents, ParsedPrompt } from '../types'
import { parsePromptMarkdown } from '../parse-prompt-md'

export class LocalProvider implements OriginProvider {
    /** Absolute path to the directory containing .md files */
    private dirPath: string
    /** Origin identifier (e.g., 'local:./prompts') */
    private origin: string

    constructor(origin: string) {
        this.origin = origin
        // Extract fs path from origin URI: 'local:./prompts' -> './prompts'
        const fsPath = origin.replace(/^local:/, '')
        this.dirPath = path.resolve(process.cwd(), fsPath)
    }

    async read(): Promise<OriginContents> {
        const prompts: ParsedPrompt[] = []

        // Read all .md files recursively
        const mdFiles = this.findFiles(this.dirPath, '.md')
        for (const filePath of mdFiles) {
            const relativePath = path.relative(this.dirPath, filePath).replace(/\\/g, '/')
            const slug = this.slugFromPath(relativePath)
            const content = fs.readFileSync(filePath, 'utf-8')
            const parsed = parsePromptMarkdown(slug, content, relativePath)
            if (parsed) {
                prompts.push(parsed)
            }
        }

        // Compute a content hash as version identifier
        const contentHash = this.computeContentHash(prompts)

        return {
            origin: this.origin,
            version: contentHash,
            prompts,
        }
    }

    /**
     * Recursively find all files with a given extension in a directory.
     */
    private findFiles(dir: string, extension: string): string[] {
        if (!fs.existsSync(dir)) return []

        const results: string[] = []
        const entries = fs.readdirSync(dir, { withFileTypes: true })

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name)
            if (entry.isDirectory()) {
                results.push(...this.findFiles(fullPath, extension))
            } else if (entry.isFile() && entry.name.endsWith(extension)) {
                results.push(fullPath)
            }
        }

        return results
    }

    /**
     * Derive a slug from a relative path.
     * e.g., 'admissibilidade-de-recurso/pedidos-viabilidade-recurso.md' -> 'pedidos-viabilidade-recurso'
     * e.g., 'analise-completa.md' -> 'analise-completa'
     */
    private slugFromPath(relativePath: string): string {
        const basename = path.basename(relativePath, '.md')
        return basename
    }

    /**
     * Compute a hash of all prompt contents for versioning.
     */
    private computeContentHash(prompts: ParsedPrompt[]): string {
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
}
