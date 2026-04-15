/**
 * Local filesystem library provider.
 * 
 * Reads prompt .md files from a directory on disk.
 * Used for the built-in prompts shipped with the application (prompts/ directory).
 */
import fs from 'fs'
import path from 'path'
import { OriginProvider, OriginContents } from '../types'
import { parseFiles, computeContentHash } from './shared'

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
        // Read all .md files recursively
        const mdFiles = this.findFiles(this.dirPath, '.md')
        const rawFiles = mdFiles.map(filePath => ({
            relativePath: path.relative(this.dirPath, filePath).replace(/\\/g, '/'),
            content: fs.readFileSync(filePath, 'utf-8'),
        }))

        const prompts = parseFiles(rawFiles)

        return {
            origin: this.origin,
            version: computeContentHash(prompts),
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
            } else if (entry.isFile() && entry.name.endsWith(extension) && !/^readme\.md$/i.test(entry.name)) {
                results.push(fullPath)
            }
        }

        return results
    }
}
