'use server'

import { Suspense } from 'react'
import { headers } from 'next/headers'
import { ActionButtons } from './print-buttons'

interface ProcessedContent {
    title: string
    html: string
    timestamp: string
}

interface CacheData {
    processedContents: Record<number, ProcessedContent>
    promptId: number
    promptName: string
    processNumber: string
    processTitle: string
    generatedAt: string
}

async function StaticPageContent({ cacheKey }: { cacheKey: string }) {
    // Valida se a chave de cache foi fornecida
    if (!cacheKey) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger">
                    <h4>Chave de Cache Inválida</h4>
                    <p>A página foi acessada sem uma chave de cache válida. Por favor, gere a página novamente.</p>
                </div>
            </div>
        )
    }

    try {
        // Construir URL absoluta usando headers do Next.js
        const headersList = await headers()
        const host = headersList.get('host') || 'localhost:3000'
        const protocol = headersList.get('x-forwarded-proto') || 'http'
        const baseUrl = `${protocol}://${host}`
        
        const response = await fetch(`${baseUrl}/api/v1/static-page-cache?key=${encodeURIComponent(cacheKey)}`, {
            next: { revalidate: 300 } // Cache por 5 minutos
        })

        if (!response.ok) {
            return (
                <div className="container mt-5">
                    <div className="alert alert-danger">
                        <h4>Sessão Expirada</h4>
                        <p>Os dados desta página expiraram. Por favor, gere a página novamente.</p>
                    </div>
                </div>
            )
        }

        const data: CacheData = await response.json()

        return (
            <div>
                <div className="container-lg bg-white py-5">
                    <header className="mb-5 pb-4 border-bottom">
                        <h1 className="mb-3">{data.promptName}</h1>
                        <p className="text-muted mb-2">
                            <strong>Processo:</strong> {data.processNumber}
                        </p>
                        <p className="text-muted">
                            <strong>Título:</strong> {data.processTitle}
                        </p>
                    </header>

                    {Object.entries(data.processedContents)
                        .sort(([idxA], [idxB]) => parseInt(idxA) - parseInt(idxB))
                        .map(([idx, content]) => (
                            <section
                                key={idx}
                                className="mb-5"
                                style={{ pageBreakInside: 'avoid' }}
                            >
                                <h2 className="h4 mb-3 pb-2 border-bottom">
                                    {content.title}
                                </h2>
                                <article
                                    className="content-article lh-lg text-dark"
                                    dangerouslySetInnerHTML={{ __html: content.html }}
                                />
                            </section>
                        ))}

                    <footer className="mt-5 pt-4 border-top text-center small text-muted">
                        <p className="mb-2">
                            Documento gerado pela Apoia em {data.generatedAt}
                        </p>
                        <p className="mb-0" style={{ fontSize: '0.85rem' }}>
                            Esta página foi otimizada para leitura em navegadores móveis e suporta Web Speech API para síntese de voz.
                        </p>
                    </footer>
                </div>

                <style>{`
                    @media print {
                        body {
                            background: white;
                        }
                        .d-print-none {
                            display: none !important;
                        }
                        section {
                            page-break-inside: avoid;
                        }
                        a {
                            text-decoration: none;
                            color: #333;
                        }
                    }

                    @media (max-width: 768px) {
                        .container-lg {
                            padding-left: 10px;
                            padding-right: 10px;
                        }
                        h1 {
                            font-size: 1.5rem;
                        }
                        h2 {
                            font-size: 1.2rem;
                        }
                    }

                    /* Otimizar para WAI-ARIA e leitores de tela */
                    article {
                        word-spacing: 0.1em;
                        letter-spacing: 0.05em;
                    }
                `}</style>
            </div>
        )
    } catch (error) {
        console.error('[Static Page] Error:', error)
        return (
            <div className="container mt-5">
                <div className="alert alert-danger">
                    <h4>Erro ao Carregar Página</h4>
                    <p>Houve um erro ao processar sua requisição. Tente novamente.</p>
                </div>
            </div>
        )
    }
}

export default async function StaticAudioPage({
    params,
    searchParams
}: {
    params: Promise<{ number: string }>
    searchParams: Promise<{ cache?: string }>
}) {
    const { number } = await params
    const { cache } = await searchParams

    return (
        <Suspense
            fallback={
                <div className="container mt-5">
                    <div className="alert alert-info">Carregando conteúdo...</div>
                </div>
            }
        >
            <StaticPageContent cacheKey={cache || ''} />
        </Suspense>
    )
}
