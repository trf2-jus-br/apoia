import { NextRequest, NextResponse } from 'next/server'

interface CacheData {
    processedContents: Record<number, { title: string; html: string; timestamp: string }>
    promptId: number
    promptName: string
    processNumber: string
    processTitle: string
    generatedAt: string
}

// In-memory cache com expiração automática
const cache = new Map<string, { data: CacheData; expiresAt: number }>()

// Limpar entradas expiradas a cada 5 minutos
setInterval(() => {
    const now = Date.now()
    for (const [key, value] of cache.entries()) {
        if (value.expiresAt < now) {
            cache.delete(key)
        }
    }
}, 5 * 60 * 1000)

export async function POST(req: NextRequest) {
    try {
        const data: CacheData = await req.json()

        // Valida dados obrigatórios
        if (!data.processedContents || !data.promptId || !data.processNumber) {
            return NextResponse.json(
                { error: 'Dados incompletos' },
                { status: 400 }
            )
        }

        // Gera um token UUID
        const cacheKey = crypto.randomUUID()

        // Armazena com expiração de 10 minutos
        const expirationTime = Date.now() + 10 * 60 * 1000
        cache.set(cacheKey, { data, expiresAt: expirationTime })

        return NextResponse.json({ cacheKey })
    } catch (error) {
        console.error('[Static Page Cache] POST Error:', error)
        return NextResponse.json(
            { error: 'Erro ao cachear dados' },
            { status: 500 }
        )
    }
}

export async function GET(req: NextRequest) {
    try {
        const key = req.nextUrl.searchParams.get('key')

        if (!key) {
            return NextResponse.json(
                { error: 'Cache key não fornecida' },
                { status: 400 }
            )
        }

        const cached = cache.get(key)

        if (!cached) {
            return NextResponse.json(
                { error: 'Cache expirado ou inválido' },
                { status: 404 }
            )
        }

        // Verifica se expirou
        if (cached.expiresAt < Date.now()) {
            cache.delete(key)
            return NextResponse.json(
                { error: 'Cache expirado' },
                { status: 404 }
            )
        }

        return NextResponse.json(cached.data, {
            headers: {
                'Cache-Control': 'public, max-age=300, s-maxage=300'
            }
        })
    } catch (error) {
        console.error('[Static Page Cache] GET Error:', error)
        return NextResponse.json(
            { error: 'Erro ao recuperar dados em cache' },
            { status: 500 }
        )
    }
}
