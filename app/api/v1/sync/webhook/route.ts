/**
 * Webhook endpoint for automatic prompt library sync.
 * 
 * Called by GitHub/GitLab on push events to trigger re-sync of a library.
 * 
 * Security: validates request using PROMPT_LIBRARY_SECRET
 *   - GitHub: X-Hub-Signature-256 header (HMAC-SHA256)
 *   - GitLab: X-Gitlab-Token header (shared secret)
 * 
 * POST /api/v1/sync/webhook
*/
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import devLog from '@/lib/utils/log'
import { parseLibrariesEnv, findLibraryConfig } from '@/lib/sync/providers/factory'
import { syncLibraryByUrl, syncAllLibraries } from '@/lib/sync'

export async function GET() {
    if (process.env.VERCEL_ENV !== "development")
        return NextResponse.json({ errormsg: 'GET endpoint not available in production' }, { status: 503 })

    let logRecords: string[] = []

    const log = (msg: string, ...args: any[]) => {
        const formatted = [msg, ...args].map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')
        logRecords.push(formatted)
        devLog('[sync-webhook]', formatted)
    }

    try {
        const syncResults = await syncAllLibraries()
        for (const syncResult of syncResults) {
            if (syncResults)
                log(`[sync-engine] Origin "${syncResult.origin}" synced: +${syncResult.added} ~${syncResult.updated} -${syncResult.deactivated} =${syncResult.unchanged}${syncResult.errors.length ? ` (${syncResult.errors.length} errors)` : ''}`)

            if (syncResult.errors.length > 0) {
                log(`[sync] Errors for ${syncResult.origin}:`, syncResult.errors)
            }
        }
    } catch (err: any) {
        log('[sync] Failed to sync prompt libraries:', err?.message)
    }

    return new NextResponse(logRecords.join('\n'), {
        headers: { 'Content-Type': 'text/plain' },
    })
}

export async function POST(req: Request) {
    const secret = process.env.PROMPT_LIBRARY_SECRET
    if (!secret) {
        return NextResponse.json({ errormsg: 'Webhook not configured' }, { status: 503 })
    }

    const body = await req.text()

    // Determine platform and verify authenticity
    const githubSig = req.headers.get('x-hub-signature-256')
    const gitlabToken = req.headers.get('x-gitlab-token')

    if (githubSig) {
        // GitHub webhook verification
        const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
        if (!crypto.timingSafeEqual(Buffer.from(githubSig), Buffer.from(expected))) {
            return NextResponse.json({ errormsg: 'Invalid signature' }, { status: 401 })
        }
    } else if (gitlabToken) {
        // GitLab webhook verification
        if (!crypto.timingSafeEqual(Buffer.from(gitlabToken), Buffer.from(secret))) {
            return NextResponse.json({ errormsg: 'Invalid token' }, { status: 401 })
        }
    } else {
        return NextResponse.json({ errormsg: 'Missing authentication header' }, { status: 401 })
    }

    // Parse the webhook payload
    let payload: any
    try {
        payload = JSON.parse(body)
    } catch {
        return NextResponse.json({ errormsg: 'Invalid JSON payload' }, { status: 400 })
    }

    // Extract the repository URL from the payload
    const repoUrl = extractRepoUrl(payload, req.headers)
    if (!repoUrl) {
        return NextResponse.json({ errormsg: 'Could not determine repository URL from payload' }, { status: 400 })
    }

    // Check that this repo is in our PROMPT_LIBRARIES list
    const configs = parseLibrariesEnv(process.env.PROMPT_LIBRARIES)
    const matchedCfg = findLibraryConfig(repoUrl, configs)

    if (!matchedCfg) {
        devLog(`[webhook] Repository ${repoUrl} not found in PROMPT_LIBRARIES`)
        return NextResponse.json({ errormsg: 'Repository not configured for sync' }, { status: 404 })
    }

    // Check if this is a push to the configured branch
    const branch = extractBranch(payload)
    const configuredBranch = matchedCfg.url.includes('#') ? matchedCfg.url.split('#')[1] : 'main'
    if (branch && branch !== configuredBranch) {
        devLog(`[webhook] Push to ${branch}, configured branch is ${configuredBranch} — skipping`)
        return NextResponse.json({ status: 'skipped', reason: `Push to ${branch}, not ${configuredBranch}` })
    }

    // Trigger sync
    try {
        const result = await syncLibraryByUrl(matchedCfg.url)
        devLog(`[webhook] Sync complete for ${matchedCfg.url}: +${result.added} ~${result.updated} -${result.deactivated}`)

        return NextResponse.json({
            status: 'ok',
            origin: result.origin,
            added: result.added,
            updated: result.updated,
            deactivated: result.deactivated,
            unchanged: result.unchanged,
            errors: result.errors.length > 0 ? result.errors : undefined,
        })
    } catch (err: any) {
        console.error('[webhook] Sync failed:', err?.message)
        return NextResponse.json({ errormsg: `Sync failed: ${err?.message}` }, { status: 500 })
    }
}

/**
 * Extract the repository HTTPS URL from a webhook payload.
 * Supports GitHub and GitLab payload formats.
 */
function extractRepoUrl(payload: any, headers: Headers): string | null {
    // GitHub format
    if (payload.repository?.html_url) {
        return payload.repository.html_url
    }
    // GitLab format
    if (payload.project?.web_url) {
        return payload.project.web_url
    }
    // GitLab alternative
    if (payload.repository?.homepage) {
        return payload.repository.homepage
    }
    return null
}

/**
 * Extract the branch name from a push webhook payload.
 * Returns the short branch name (e.g., 'main', not 'refs/heads/main').
 */
function extractBranch(payload: any): string | null {
    // GitHub and GitLab both use 'ref' field
    const ref = payload.ref as string | undefined
    if (!ref) return null
    // refs/heads/main -> main
    return ref.replace(/^refs\/heads\//, '')
}
