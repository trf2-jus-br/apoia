/**
 * Provider factory.
 * 
 * Creates the appropriate OriginProvider based on a library URL:
 *   - Local paths (starting with './' or '/') -> LocalProvider
 *   - github.com URLs -> GitHubProvider
 *   - Other HTTPS URLs -> GitLabProvider (generic Git hosting)
 */
import { OriginProvider } from '../types'
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
 * Parse the PROMPT_LIBRARIES_TOKENS environment variable into a URL->token map.
 * 
 * Format: "url1=token1,url2=token2"
 * The URL part is matched against library URLs (substring match).
 */
export function parseTokensEnv(tokensEnv: string | undefined): Map<string, string> {
    const tokens = new Map<string, string>()
    if (!tokensEnv) return tokens

    for (const entry of tokensEnv.split(',')) {
        const eqIdx = entry.indexOf('=')
        if (eqIdx === -1) continue
        const url = entry.substring(0, eqIdx).trim()
        const token = entry.substring(eqIdx + 1).trim()
        if (url && token) {
            tokens.set(url, token)
        }
    }

    return tokens
}

/**
 * Find a token for a given library URL from the tokens map.
 * Uses substring matching: if any token key is contained in the URL, it matches.
 */
export function findToken(url: string, tokens: Map<string, string>): string | undefined {
    for (const [pattern, token] of tokens) {
        if (url.includes(pattern)) {
            return token
        }
    }
    return undefined
}
