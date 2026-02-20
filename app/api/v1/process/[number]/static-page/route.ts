import { NextResponse, NextRequest } from "next/server"
import { assertApiUser } from "@/lib/user"
import { withErrorHandler } from "@/lib/utils/api-error"

interface ProcessedContentType {
    title: string
    html: string
    timestamp: string
}

interface StaticPageRequest {
    promptId: string
    promptName: string
    processedContents: Record<number, ProcessedContentType>
    processData: {
        numeroDoProcesso: string
        titulo: string
    }
}

function generateStaticPageHTML(data: StaticPageRequest): string {
    const contents = Object.values(data.processedContents)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        .map(content => `
            <section class="static-page-section">
                <h2>${escapeHtml(content.title)}</h2>
                <article class="content">
                    ${content.html}
                </article>
            </section>
        `).join('')

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(data.processData.titulo)} - Apoia</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            padding: 20px;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .page-header {
            margin-bottom: 40px;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 20px;
        }
        
        .page-header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            color: #1a1a1a;
        }
        
        .page-meta {
            font-size: 14px;
            color: #666;
            margin-top: 10px;
        }
        
        .static-page-section {
            margin-bottom: 40px;
        }
        
        .static-page-section h2 {
            font-size: 20px;
            margin-bottom: 20px;
            color: #2c3e50;
            border-left: 4px solid #0066cc;
            padding-left: 12px;
        }
        
        .content {
            font-size: 16px;
            line-height: 1.8;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .content p {
            margin-bottom: 12px;
        }
        
        .content h3 {
            font-size: 18px;
            margin-top: 20px;
            margin-bottom: 10px;
            color: #34495e;
        }
        
        .content ul, .content ol {
            margin-left: 20px;
            margin-bottom: 12px;
        }
        
        .content li {
            margin-bottom: 6px;
        }
        
        .content strong {
            font-weight: 600;
            color: #1a1a1a;
        }
        
        .content em {
            font-style: italic;
            color: #555;
        }
        
        .content blockquote {
            border-left: 4px solid #ddd;
            padding-left: 12px;
            margin-left: 0;
            margin-bottom: 12px;
            color: #666;
        }
        
        .content code {
            background-color: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
        }
        
        .content pre {
            background-color: #f5f5f5;
            padding: 12px;
            border-radius: 4px;
            overflow-x: auto;
            margin-bottom: 12px;
        }
        
        /* Print styles */
        @media print {
            body {
                background-color: white;
                padding: 0;
            }
            
            .container {
                box-shadow: none;
                border-radius: 0;
                padding: 0;
            }
            
            .static-page-section {
                page-break-inside: avoid;
            }
        }
        
        /* Mobile optimizations for better text-to-speech */
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            
            .container {
                padding: 15px;
            }
            
            .page-header h1 {
                font-size: 22px;
            }
            
            .static-page-section h2 {
                font-size: 18px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="page-header">
            <h1>${escapeHtml(data.processData.titulo)}</h1>
            <div class="page-meta">
                <p>Processo: <strong>${escapeHtml(data.processData.numeroDoProcesso)}</strong></p>
                <p>Análise: <strong>${escapeHtml(data.promptName)}</strong></p>
                <p>Gerado em: <strong>${new Date().toLocaleString('pt-BR')}</strong></p>
            </div>
        </div>
        
        ${contents}
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
            <p>Este documento foi gerado pela Apoia, ferramenta de inteligência artificial desenvolvida exclusivamente para facilitar a triagem de acervo, e não substitui a elaboração de relatório específico em cada processo, a partir da consulta manual aos eventos dos autos. Textos gerados por inteligência artificial podem conter informações imprecisas ou incorretas.</p>
        </div>
    </div>
</body>
</html>`

    return html
}

function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }
    return text.replace(/[&<>"']/g, char => map[char])
}

async function POST_HANDLER(
    req: NextRequest,
    props: { params: Promise<{ number: string }> }
) {
    const { params } = props
    const number = (await params).number

    try {
        const pUser = assertApiUser()
        const user = await pUser

        const body: StaticPageRequest = await req.json()

        if (!body.processedContents || Object.keys(body.processedContents).length === 0) {
            return NextResponse.json(
                { error: 'Nenhum conteúdo processado fornecido' },
                { status: 400 }
            )
        }

        const html = generateStaticPageHTML(body)

        // Generate a unique ID for this static page
        const pageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        // Return the HTML directly as a data URL for immediate viewing
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`

        // Or create a route where the page can be served
        // For now, returning the URL that will open the page
        const url = `/preview/static-page/${pageId}`

        return NextResponse.json({
            success: true,
            url: url,
            htmlContent: html // Include HTML so frontend can open it directly if needed
        })
    } catch (error) {
        return withErrorHandler(error)
    }
}

export { POST_HANDLER as POST }
