/**
 * Abstract Git-based library provider.
 * 
 * Implements the common flow for Git hosting services (GitHub, GitLab, etc.):
 * 1. Fetch the latest commit SHA for version comparison
 * 2. Download the repository tarball
 * 3. Extract .md files from the tarball in memory
 * 4. Parse them using the shared parseFiles utility
 * 
 * Subclasses (GitHubProvider, GitLabProvider) implement the platform-specific
 * API calls: fetchCommitSha() and fetchTarballResponse().
 */
import { Readable } from 'stream'
import { createGunzip } from 'zlib'
import * as tar from 'tar-stream'
import { OriginProvider, OriginContents } from '../types'
import { RawFile, parseFiles } from './shared'
import devLog from '../../utils/log'

export abstract class GitProvider implements OriginProvider {
    /** Origin identifier (e.g., 'https://github.com/owner/repo') */
    readonly origin: string
    /** Repository owner (user or org) */
    readonly owner: string
    /** Repository name */
    readonly repo: string
    /** Branch or tag to sync from */
    readonly ref: string
    /** Optional auth token for private repos */
    readonly token?: string

    constructor(origin: string, token?: string) {
        this.origin = origin
        this.token = token

        const parsed = this.parseOriginUrl(origin)
        this.owner = parsed.owner
        this.repo = parsed.repo
        this.ref = parsed.ref
    }

    /**
     * Parse the origin URL into owner, repo, and ref.
     * Supports:
     *   https://github.com/owner/repo
     *   https://github.com/owner/repo#branch
     *   https://gitlab.com/group/subgroup/repo
     *   https://gitlab.com/group/repo#branch
     */
    protected parseOriginUrl(url: string): { owner: string; repo: string; ref: string } {
        let ref = 'main'
        let cleanUrl = url

        // Extract #branch suffix
        const hashIdx = url.indexOf('#')
        if (hashIdx !== -1) {
            ref = url.substring(hashIdx + 1)
            cleanUrl = url.substring(0, hashIdx)
        }

        // Remove trailing slashes and .git suffix
        cleanUrl = cleanUrl.replace(/\/+$/, '').replace(/\.git$/, '')

        // Parse path: everything after the host
        const urlObj = new URL(cleanUrl)
        const parts = urlObj.pathname.split('/').filter(Boolean)

        if (parts.length < 2) {
            throw new Error(`Invalid git repository URL: ${url}. Expected at least owner/repo in path.`)
        }

        // For GitLab nested groups: owner = everything except last part, repo = last part
        const repo = parts[parts.length - 1]
        const owner = parts.slice(0, -1).join('/')

        return { owner, repo, ref }
    }

    /**
     * Read prompts from the remote Git repository.
     */
    async read(): Promise<OriginContents> {
        const commitSha = await this.fetchCommitSha()
        devLog(`[sync:git] ${this.origin} — commit ${commitSha.substring(0, 8)}`)

        const response = await this.fetchTarballResponse()
        const rawFiles = await this.extractMdFiles(response)
        devLog(`[sync:git] ${this.origin} — extracted ${rawFiles.length} .md files`)

        const prompts = parseFiles(rawFiles)

        return {
            origin: this.origin,
            version: commitSha.substring(0, 16),
            prompts,
        }
    }

    /**
     * Fetch the latest commit SHA for the configured ref.
     * Platform-specific: implemented by subclasses.
     */
    protected abstract fetchCommitSha(): Promise<string>

    /**
     * Fetch the repository tarball as a Response (or compatible object with .body).
     * Platform-specific: implemented by subclasses.
     */
    protected abstract fetchTarballResponse(): Promise<Response>

    /**
     * Build the common auth headers. Subclasses may override for platform-specific headers.
     */
    protected buildAuthHeaders(): Record<string, string> {
        if (!this.token) return {}
        return { 'Authorization': `Bearer ${this.token}` }
    }

    /**
     * Extract all .md files from a tarball (gzip-compressed) Response.
     * Processes the stream in memory — does not write to disk.
     */
    private async extractMdFiles(response: Response): Promise<RawFile[]> {
        const rawFiles: RawFile[] = []

        if (!response.body) {
            throw new Error('Tarball response has no body')
        }

        // Convert web ReadableStream to Node.js Readable
        const nodeStream = Readable.fromWeb(response.body as any)

        return new Promise<RawFile[]>((resolve, reject) => {
            const extract = tar.extract()

            extract.on('entry', (header, stream, next) => {
                const chunks: Buffer[] = []

                if (header.type === 'file' && header.name.endsWith('.md')) {
                    // Strip the tarball prefix directory to get the relative path
                    const parts = header.name.split('/')
                    const relativePath = parts.slice(1).join('/')
                    // Skip README files — they are not prompts
                    if (!relativePath || /^readme\.md$/i.test(relativePath.split('/').pop()!)) {
                        stream.on('end', next)
                    } else {
                        stream.on('data', (chunk: Buffer) => chunks.push(chunk))
                        stream.on('end', () => {
                            const content = Buffer.concat(chunks).toString('utf-8')
                            rawFiles.push({ relativePath, content })
                            next()
                        })
                    }
                } else {
                    stream.on('end', next)
                }

                stream.resume()
            })

            extract.on('finish', () => resolve(rawFiles))
            extract.on('error', reject)

            nodeStream
                .pipe(createGunzip())
                .pipe(extract)
                .on('error', reject)
        })
    }
}
