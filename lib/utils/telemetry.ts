// Heartbeat de telemetria do processo Node para diagnóstico de OOM/leak.
//
// Loga a cada N ms (default 30s) uma única linha JSON agregada com o estado
// do processo: memoria (rss/heap/external), handles ativos, latência do
// event loop e uptime. O campo "pod" identifica qual dos pods está doente.
//
// Foi pensado para ser consultado no Grafana/Loki filtrando por type=heartbeat.
// Tudo nativo do Node, sem deps novas. Nunca derruba a aplicacao.

import { monitorEventLoopDelay } from 'node:perf_hooks'

const BYTES_PER_MB = 1024 * 1024

function bytesToMb(bytes: number): number {
    return Math.round((bytes / BYTES_PER_MB) * 100) / 100
}

function activeHandlesCount(): number {
    // process._getActiveHandles() é API interna do Node (nao documentada),
    // porem estavel na pratica. Retorna sockets, timers, streams, etc. abertos.
    try {
        const handles = (process as unknown as { _getActiveHandles?: () => unknown[] })._getActiveHandles
        return handles ? handles.call(process).length : -1
    } catch {
        return -1
    }
}

export function startHeartbeat(): void {
    if (process.env.TELEMETRY_DISABLED === '1') return
    if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== 'nodejs') return

    const intervalMs = process.env.TELEMETRY_INTERVAL_MS
        ? parseInt(process.env.TELEMETRY_INTERVAL_MS)
        : 30000
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return

    const pod = process.env.HOSTNAME || 'unknown'

    // monitorEventLoopDelay mede o atraso do event loop entre ticks.
    // habilita a coleta; resetamos a cada intervalo para obter a média do periodo.
    const histogram = monitorEventLoopDelay()
    histogram.enable()

    const tick = () => {
        try {
            const mem = process.memoryUsage()
            const lagNs = histogram.mean // nanossegundos médios desde o último reset
            histogram.reset()

            const payload = {
                type: 'heartbeat',
                pod,
                uptime_s: Math.round(process.uptime()),
                rss_mb: bytesToMb(mem.rss),
                heap_used_mb: bytesToMb(mem.heapUsed),
                heap_total_mb: bytesToMb(mem.heapTotal),
                external_mb: bytesToMb(mem.external),
                array_buffers_mb: bytesToMb(mem.arrayBuffers),
                active_handles: activeHandlesCount(),
                event_loop_lag_ms: lagNs ? Math.round(lagNs / 1e6 * 100) / 100 : 0,
                ts: new Date().toISOString(),
            }
            console.log(JSON.stringify(payload))
        } catch {
            // Telemetria nunca pode derrubar a aplicacao.
        }
    }

    setInterval(tick, intervalMs).unref()
    // .unref() permite que o processo encerre normalmente mesmo com o timer ativo.
}
