/**
 * Provider factory.
 * 
 * Creates the appropriate OriginProvider based on a library URL:
 *   - Local paths (starting with './' or '/') -> LocalProvider
 *   - github.com URLs -> GitHubProvider
 *   - Other HTTPS URLs -> GitLabProvider (generic Git hosting)
 * 
 * PROMPT_LIBRARIES format (semicolon-separated entries):
 *   url,slug-prefix,token;url2,prefix2;url3
 *   - Each entry: url[,slugPrefix[,token]]
 *   - slug-prefix and token are optional
 */
import { LibraryConfig, OriginProvider } from '../types'
import { LocalProvider } from './local'
import { GitHubProvider } from './github'
import { GitLabProvider } from './gitlab'

/**
 * Create an OriginProvider for the given library URL.
 * 
 * @param url - Library URL or path. Examples:
 *   - 'local:./prompts' or './prompts' — local filesystem
 *   - 'https://github.com/owner/repo' — GitHub
 *   - 'https://github.com/owner/repo#branch' — GitHub with specific branch
 *   - 'https://gitlab.com/group/repo' — GitLab
 *   - 'https://gitlab.example.com/group/repo' — Self-hosted GitLab
 * @param token - Optional auth token for private repositories
 */
export function createProvider(url: string, token?: string): OriginProvider {
    // Local filesystem providers
    if (url.startsWith('local:') || url.startsWith('./') || url.startsWith('/')) {
        const origin = url.startsWith('local:') ? url : `local:${url}`
        return new LocalProvider(origin)
    }

    // Parse the URL to determine the hosting platform
    const cleanUrl = url.replace(/#.*$/, '')
    let hostname: string
    try {
        hostname = new URL(cleanUrl).hostname
    } catch {
        throw new Error(`Invalid library URL: ${url}`)
    }

    if (hostname === 'github.com') {
        return new GitHubProvider(url, token)
    }

    // Default to GitLab for any other HTTPS git hosting
    return new GitLabProvider(url, token)
}

/**
 * Parse the PROMPT_LIBRARIES environment variable into an array of LibraryConfig.
 * 
 * Format: "url,slug-prefix,token;url2,prefix2;url3"
 *   - Entries are separated by semicolons
 *   - Within each entry: url,slugPrefix,token (comma-separated)
 *   - slugPrefix and token are optional
 *   - An empty slugPrefix field (url,,token) is allowed
 */
export function parseLibrariesEnv(librariesEnv: string | undefined): LibraryConfig[] {
    if (!librariesEnv) return []

    const configs: LibraryConfig[] = []
    const entries = librariesEnv.split(';')

    for (const entry of entries) {
        const trimmed = entry.trim()
        if (!trimmed) continue

        const parts = trimmed.split(',').map(s => s.trim())
        const url = parts[0]
        if (!url) continue

        const slugPrefix = parts[1] || undefined
        const token = parts[2] || undefined

        configs.push({ url, slugPrefix, token })
    }

    return configs
}

/**
 * Find a LibraryConfig whose URL matches the given repo URL.
 * Uses substring matching: if the config URL (without #branch) is contained
 * in the repo URL, or vice versa, it matches.
 */
export function findLibraryConfig(repoUrl: string, configs: LibraryConfig[]): LibraryConfig | undefined {
    return configs.find(cfg => {
        const cfgClean = cfg.url.replace(/#.*$/, '')
        return repoUrl.includes(cfgClean) || cfgClean.includes(repoUrl)
    })
}
