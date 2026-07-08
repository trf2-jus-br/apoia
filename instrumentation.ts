import * as Sentry from '@sentry/nextjs'

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('./sentry.server.config');
        console.log('Sentry register - runtime:', process.env.NEXT_RUNTIME)
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('./sentry.edge.config');
    }
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        if (process.env.IGNORE_SSL_ERRORS === 'true') {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
            console.warn('[security] NODE_TLS_REJECT_UNAUTHORIZED=0: SSL certificate verification is disabled (IGNORE_SSL_ERRORS=true)')
        }

        // Heartbeat de telemetria para diagnostico de OOM/leak (memoria, handles, event loop).
        // Loga uma linha JSON a cada 30s por pod. Opt-out via TELEMETRY_DISABLED=1.
        // const { startHeartbeat } = await import('./lib/utils/telemetry')
        // startHeartbeat()

        const { migrateIfNeeded } = await import('./lib/migrate-on-start')
        await migrateIfNeeded()

        // Sync prompt libraries (local + configured remote) into the database
        try {
            const { syncAllLibraries } = await import('./lib/sync')
            const syncResults = await syncAllLibraries()
            for (const syncResult of syncResults) {
                if (syncResult.errors.length > 0) {
                    console.error(`[sync] Errors for ${syncResult.origin}:`, syncResult.errors)
                }
            }
        } catch (err: any) {
            console.error('[sync] Failed to sync prompt libraries:', err?.message)
        }

        // In development, watch local prompt directories for changes
        if (process.env.NODE_ENV === 'development') {
            const { watchLocalLibraries } = await import('./lib/sync/watch-local')
            watchLocalLibraries()
        }

        if (!process.env.APP_CODE || !process.env.APP_HOST || !process.env.APP_PORT || !process.env.APP_REGISTRY_HOST || !process.env.APP_REGISTRY_PORT) return
        // await import('lib/eureka')
    }
}

export const onRequestError = Sentry.captureRequestError;