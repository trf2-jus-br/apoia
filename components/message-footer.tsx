import devLog from "@/lib/utils/log"
import { UIMessage } from "ai"
import React, { useEffect, useState } from "react"

export default function MessageFooter({ message }: { message: UIMessage }) {
    const [dollarRate, setDollarRate] = useState<number | null>(null)

    useEffect(() => {
        let mounted = true
        const CACHE_KEY = 'dollarRate'
        const TS_KEY = 'dollarRateTs'
        const TTL = 10 * 60 * 1000 // 10 minutes

        // Try to read from localStorage cache first
        try {
            const cached = localStorage.getItem(CACHE_KEY)
            const ts = Number(localStorage.getItem(TS_KEY) || '0')
            if (cached && Date.now() - ts < TTL) {
                setDollarRate(Number(cached))
                return
            }
        } catch (e) {
            // ignore localStorage errors
        }

        // Fetch latest rate and update cache
        (async () => {
            try {
                const res = await fetch('/api/v1/report/dollar', { cache: 'no-cache' })
                if (!res.ok) {
                    setDollarRate(null)
                    return
                }
                const json = await res.json()
                const rate = json?.rate ?? null
                if (!mounted) return
                setDollarRate(rate)
                if (rate != null) {
                    try {
                        localStorage.setItem(CACHE_KEY, String(rate))
                        localStorage.setItem(TS_KEY, String(Date.now()))
                    } catch (e) {
                        // ignore localStorage write errors
                    }
                }
            } catch (err) {
                devLog('Dollar rate fetch error:', err)
            }
        })()

        return () => {
            mounted = false
        }
    }, [])

    const finish = message?.metadata as any
    if (!finish) return undefined
    const usage = finish?.usage
    const dollarValue = finish?.usage?.dollarValue
    const modelUsed = finish?.model

    if (!dollarValue) return undefined

    // Provide a single-line footer string early return to populate the existing p
    const parts: string[] = []
    if ((usage as any)?.cachedInputTokens != null) parts.push(`cached ${usage.cachedInputTokens}`)
    if ((usage as any)?.inputTokens != null) parts.push(`input ${usage.inputTokens}`)
    if ((usage as any)?.reasoningTokens != null) parts.push(`reasoning ${usage.reasoningTokens}`)
    if ((usage as any)?.outputTokens != null) parts.push(`output ${usage.outputTokens}`)
    if ((usage as any)?.totalTokens != null) parts.push(`total ${usage.totalTokens}`)
    const tokenPart = parts.length ? `Tokens: ${parts.join(' | ')}` : 'Tokens: —'
    const modelPart = modelUsed ? `\nModelo: ${modelUsed}` : ''
    const footerHint = `${tokenPart}\nCusto em Dólares: ${dollarValue?.toFixed(5)} | Cotação do Dólar: ${dollarRate == null ? '—' : dollarRate?.toFixed(2)}${modelPart}`
    return <p className="mt-0 mb-0 h-print" style={{ fontSize: '0.8rem', opacity: 0.3 }} title={footerHint} aria-label={footerHint}>{dollarRate == null ? `$${dollarValue?.toFixed(2)}` : `R$${(dollarValue * dollarRate)?.toFixed(2)?.replace('.', ',')}`}</p>
}