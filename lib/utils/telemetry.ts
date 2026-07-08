// Telemetria de processo Node para diagnóstico de OOM/leak.
//
// Ponto único de instrumentação. Todos os eventos são logados como uma linha
// JSON (consulte no Grafana/Loki filtrando por type). Convenção de tipos:
//
//   - heartbeat:  estado do processo a cada 10s (memoria, handles, event loop).
//   - pieces:     por chamada de analyze/geração, com tamanho das peças e heap.
//   - http:start / http:end: cerca requisições HTTP que travam o pod.
//   - event:      evento ad-hoc (ex: chamadas a pdfToText) com context + fields.
//
// O campo "pod" usa os.hostname() para distinguir qual dos pods está doente
// (process.env.HOSTNAME no Next standalone vem do Dockerfile como "0.0.0.0").
// Tudo nativo do Node, sem deps novas. Nunca derruba a aplicação.

import { monitorEventLoopDelay } from 'node:perf_hooks'
import os from 'node:os'

const BYTES_PER_MB = 1024 * 1024

function bytesToMb(bytes: number): number {
    return Math.round((bytes / BYTES_PER_MB) * 100) / 100
}

function activeHandlesCount(): number {
    // process._getActiveHandles() é API interna do Node (não documentada),
    // porém estável na prática. Retorna sockets, timers, streams, etc. abertos.
    try {
        const handles = (process as unknown as { _getActiveHandles?: () => unknown[] })._getActiveHandles
        return handles ? handles.call(process).length : -1
    } catch {
        return -1
    }
}

function podName(): string {
    // os.hostname() retorna o nome do pod no Kubernetes (ex: apoia-7b5f4c-abc12).
    // Não usar process.env.HOSTNAME: no Next standalone o Dockerfile seta HOSTNAME=0.0.0.0.
    try {
        return os.hostname()
    } catch {
        return 'unknown'
    }
}

function heapUsedMb(): number {
    try {
        return bytesToMb(process.memoryUsage().heapUsed)
    } catch {
        return -1
    }
}

export function startHeartbeat(): void {
    if (process.env.TELEMETRY_DISABLED === '1') return
    if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== 'nodejs') return

    const intervalMs = process.env.TELEMETRY_INTERVAL_MS
        ? parseInt(process.env.TELEMETRY_INTERVAL_MS)
        : 10000
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return

    const pod = podName()

    // monitorEventLoopDelay mede o atraso do event loop entre ticks.
    // habilita a coleta; resetamos a cada intervalo para obter a média do período.
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
            // Telemetria nunca pode derrubar a aplicação.
        }
    }

    setInterval(tick, intervalMs).unref()
    // .unref() permite que o processo encerre normalmente mesmo com o timer ativo.
}

/**
 * Loga um evento ad-hoc. Use para instrumentar pontos específicos (ex: pdfToText)
 * sem criar uma função dedicada. O "context" identifica o ponto; "fields" leva
 * métricas livres (duração, tamanho, status, etc.).
 *
 * @param context   identificador do ponto instrumentado (ex: 'pdfToText:start').
 * @param fields    métricas livres.
 */
export function logEvent(context: string, fields: Record<string, number | string | boolean | undefined>): void {
    if (process.env.TELEMETRY_DISABLED === '1') return
    if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== 'nodejs') return
    try {
        const payload = {
            type: 'event',
            pod: podName(),
            context,
            heap_used_mb: heapUsedMb(),
            ...fields,
            ts: new Date().toISOString(),
        }
        console.log(JSON.stringify(payload))
    } catch {
        // Telemetria nunca pode derrubar a aplicação.
    }
}

/**
 * Loga um evento de "pieces" (peças) por chamada de analyze/geração, para
 * correlacionar o tamanho dos inputs de IA com o uso de memória do processo.
 *
 * @param context    identificador do caminho (ex: 'analyze', 'generate', 'chat', 'ai', 'batch').
 * @param fields     métricas livres (n_pecas, total_texto_chars, maior_peca_chars, etc.).
 */
export function logPiecesEvent(context: string, fields: Record<string, number | string | boolean | undefined>): void {
    logEvent(context, fields)
}

/**
 * Loga um evento HTTP (start/end) para cercar requisições que travam o pod.
 * O request_id correlaciona start e end; a request que causou a indisponibilidade
 * é aquela cujo "start" não tem "end" correspondente antes do buraco nos logs.
 *
 * @param event      'http:start' ou 'http:end'.
 * @param requestId   identificador curto da request (gerado no middleware).
 * @param fields      método, path, status, duration_ms, etc.
 */
export function logHttpEvent(event: 'http:start' | 'http:end', requestId: string, fields: Record<string, number | string | boolean | undefined>): void {
    if (process.env.TELEMETRY_DISABLED === '1') return
    if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== 'nodejs') return
    try {
        const payload = {
            type: event,
            pod: podName(),
            request_id: requestId,
            heap_used_mb: heapUsedMb(),
            ...fields,
            ts: new Date().toISOString(),
        }
        console.log(JSON.stringify(payload))
    } catch {
        // Telemetria nunca pode derrubar a aplicação.
    }
}
