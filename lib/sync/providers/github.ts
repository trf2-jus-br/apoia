/**
 * GitHub repository library provider.
 * 
 * Downloads prompt .md files from a GitHub repository via the GitHub API.
 * Supports both public and private repositories (with token).
 * 
 * Origin format: https://github.com/owner/repo  or  https://github.com/owner/repo#branch
 */
import { GitProvider } from './git-provider'

export class GitHubProvider extends GitProvider {

    protected async fetchCommitSha(): Promise<string> {
        const url = `https://api.github.com/repos/${this.owner}/${this.repo}/commits/${this.ref}`
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Apoia-Sync',
                ...this.buildAuthHeaders(),
            },
        })

        if (!response.ok) {
            throw new Error(`GitHub API error fetching commit: ${response.status} ${response.statusText} (${url})`)
        }

        const data = await response.json() as { sha: string }
        return data.sha
    }

    protected async fetchTarballResponse(): Promise<Response> {
        const url = `https://api.github.com/repos/${this.owner}/${this.repo}/tarball/${this.ref}`
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Apoia-Sync',
                ...this.buildAuthHeaders(),
            },
            redirect: 'follow',
        })

        if (!response.ok) {
            throw new Error(`GitHub API error fetching tarball: ${response.status} ${response.statusText} (${url})`)
        }

        return response
    }
}
