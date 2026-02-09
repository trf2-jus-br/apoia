'use server'

import { Suspense } from 'react'

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
        // Caminho relativo - Next.js resolve automaticamente
        const response = await fetch(`/api/v1/static-page-cache?key=${encodeURIComponent(cacheKey)}`, {
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
                <div className="d-print-none" style={{ padding: '20px', borderBottom: '1px solid #ddd' }}>
                    <button onClick={() => window.print()} className="btn btn-primary btn-sm">
                        Imprimir / Salvar PDF
                    </button>
                    <button onClick={() => window.history.back()} className="btn btn-secondary btn-sm ms-2">
                        Voltar
                    </button>
                </div>

                <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
                    <header style={{ marginBottom: '30px', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
                        <h1>{data.promptName}</h1>
                        <p className="text-muted">
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
                                style={{
                                    marginBottom: '40px',
                                    pageBreakInside: 'avoid'
                                }}
                            >
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '15px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
                                    {content.title}
                                </h2>
                                <article
                                    className="content-article"
                                    style={{
                                        lineHeight: '1.6',
                                        fontSize: '1rem',
                                        color: '#333'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: content.html }}
                                />
                            </section>
                        ))}

                    <footer
                        style={{
                            marginTop: '60px',
                            paddingTop: '20px',
                            borderTop: '1px solid #ddd',
                            fontSize: '0.9rem',
                            color: '#666',
                            textAlign: 'center'
                        }}
                    >
                        <p>
                            Documento gerado pela Apoia em {new Date().toLocaleDateString('pt-BR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                        <p style={{ fontSize: '0.85rem' }}>
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
                        div {
                            padding: 10px;
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
        <html lang="pt-BR">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="Página estática otimizada para síntese de voz e leitura" />
                <meta property="og:type" content="document" />
                <title>Página Estática - Apoia</title>
                <style>{`
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        background: #f5f5f5;
                        color: #333;
                    }
                    .container {
                        max-width: 900px;
                        margin: 0 auto;
                        background: white;
                    }
                `}</style>
            </head>
            <body>
                <Suspense
                    fallback={
                        <div className="container mt-5">
                            <div className="alert alert-info">Carregando conteúdo...</div>
                        </div>
                    }
                >
                    <StaticPageContent cacheKey={cache || ''} />
                </Suspense>
            </body>
        </html>
    )
}
