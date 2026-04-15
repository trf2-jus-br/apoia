/**
 * GitLab repository library provider.
 * 
 * Downloads prompt .md files from a GitLab repository via the GitLab API.
 * Supports both public and private repositories (with token).
 * Handles nested groups (e.g., gitlab.com/group/subgroup/repo).
 * 
 * Origin format: https://gitlab.com/owner/repo  or  https://gitlab.com/owner/repo#branch
 */
import { GitProvider } from './git-provider'

export class GitLabProvider extends GitProvider {

    /** URL-encoded project path (e.g., 'group%2Fsubgroup%2Frepo') */
    private get projectId(): string {
        return encodeURIComponent(`${this.owner}/${this.repo}`)
    }

    /** GitLab API base URL derived from the origin */
    private get apiBase(): string {
        const url = new URL(this.origin.replace(/#.*$/, ''))
        return `${url.protocol}//${url.host}/api/v4`
    }

    /**
     * GitLab uses PRIVATE-TOKEN header instead of Bearer for personal access tokens.
     */
    protected buildAuthHeaders(): Record<string, string> {
        if (!this.token) return {}
        return { 'PRIVATE-TOKEN': this.token }
    }

    protected async fetchCommitSha(): Promise<string> {
        const url = `${this.apiBase}/projects/${this.projectId}/repository/commits/${encodeURIComponent(this.ref)}`
        const response = await fetch(url, {
            headers: {
                ...this.buildAuthHeaders(),
            },
        })

        if (!response.ok) {
            throw new Error(`GitLab API error fetching commit: ${response.status} ${response.statusText} (${url})`)
        }

        const data = await response.json() as { id: string }
        return data.id
    }

    protected async fetchTarballResponse(): Promise<Response> {
        const url = `${this.apiBase}/projects/${this.projectId}/repository/archive.tar.gz?sha=${encodeURIComponent(this.ref)}`
        const response = await fetch(url, {
            headers: {
                ...this.buildAuthHeaders(),
            },
            redirect: 'follow',
        })

        if (!response.ok) {
            throw new Error(`GitLab API error fetching tarball: ${response.status} ${response.statusText} (${url})`)
        }

        return response
    }
}
