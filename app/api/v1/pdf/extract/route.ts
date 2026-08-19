import { NextRequest, NextResponse } from 'next/server'
import { pdfToText } from '@/lib/pdf/pdf'
import { assertApiUser } from '@/lib/user'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
    await assertApiUser()
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json(
                { error: 'Nenhum arquivo foi enviado' },
                { status: 400 }
            )
        }

        if (file.type !== 'application/pdf') {
            return NextResponse.json(
                { error: 'Apenas arquivos PDF são aceitos' },
                { status: 400 }
            )
        }

        // Limite de 10MB
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'O arquivo PDF é muito grande. Tamanho máximo: 10MB.' },
                { status: 400 }
            )
        }

        const arrayBuffer = await file.arrayBuffer()
        const text = await pdfToText(arrayBuffer, {})

        return NextResponse.json({ text }, { status: 200 })
    } catch (error) {
        console.error('Erro ao processar PDF:', error)
        return NextResponse.json(
            { error: 'Erro ao processar o PDF. Verifique se o arquivo não está corrompido.' },
            { status: 500 }
        )
    }
}
