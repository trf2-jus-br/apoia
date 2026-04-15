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

        if (!process.env.APP_CODE || !process.env.APP_HOST || !process.env.APP_PORT || !process.env.APP_REGISTRY_HOST || !process.env.APP_REGISTRY_PORT) return
        // await import('lib/eureka')
    }
}

export const onRequestError = Sentry.captureRequestError;