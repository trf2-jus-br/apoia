/**
 * File watcher for local prompt libraries.
 *
 * In development mode, watches directories configured as local origins in
 * PROMPT_LIBRARIES and triggers a sync when .md files change.
 */
import fs from 'fs'
import path from 'path'
import { parseLibrariesEnv, createProvider } from './providers/factory'
import { syncOrigin } from './sync-engine'

/** Debounce delay in milliseconds */
const DEBOUNCE_MS = 500

/**
 * Start watching all local directories configured in PROMPT_LIBRARIES.
 * Only call this in development mode.
 *
 * Returns a cleanup function that stops all watchers.
 */
export function watchLocalLibraries(): () => void {
    const configs = parseLibrariesEnv(process.env.PROMPT_LIBRARIES)
    const localConfigs = configs.filter(c =>
        c.url.startsWith('local:') || c.url.startsWith('./') || c.url.startsWith('/')
    )

    if (localConfigs.length === 0) {
        console.log('[watch] No local libraries configured in PROMPT_LIBRARIES')
        return () => { }
    }

    const configuredOrigins = new Set<string>(configs.map(c => c.url))
    const watchers: fs.FSWatcher[] = []

    for (const cfg of localConfigs) {
        const fsPath = cfg.url.replace(/^local:/, '')
        const dirPath = path.resolve(process.cwd(), fsPath)

        if (!fs.existsSync(dirPath)) {
            console.warn(`[watch] Directory not found, skipping: ${dirPath}`)
            continue
        }

        let timer: ReturnType<typeof setTimeout> | null = null
        let syncing = false

        const triggerSync = async () => {
            if (syncing) return
            syncing = true
            try {
                const provider = createProvider(cfg.url, cfg.token)
                const result = await syncOrigin(provider, cfg.slugPrefix, configuredOrigins)
                const { added, updated, deactivated, unchanged, errors } = result
                if (added || updated || deactivated) {
                    console.log(`[watch] Synced ${cfg.url}: +${added} ~${updated} -${deactivated} =${unchanged}`)
                }
                if (errors.length > 0) {
                    console.error(`[watch] Errors syncing ${cfg.url}:`, errors)
                }
            } catch (err: any) {
                console.error(`[watch] Failed to sync ${cfg.url}:`, err?.message)
            } finally {
                syncing = false
            }
        }

        const watcher = fs.watch(dirPath, { recursive: true }, (_event, filename) => {
            if (!filename || !filename.endsWith('.md')) return
            if (timer) clearTimeout(timer)
            timer = setTimeout(triggerSync, DEBOUNCE_MS)
        })

        watchers.push(watcher)
        console.log(`[watch] Watching local library: ${cfg.url} (${dirPath})`)
    }

    return () => {
        for (const w of watchers) w.close()
    }
}
