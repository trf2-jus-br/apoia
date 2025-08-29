'use server'

import { getSelectedModelParams } from '@/lib/ai/model-server'
import { getPiecesWithContent, waitForTexts } from '@/lib/ai/prompt'
import { TipoDeSinteseMap } from '@/lib/proc/combinacoes'
import { TiposDeSinteseValido } from '@/lib/proc/info-de-produto'
import { DadosDoProcessoType } from '@/lib/proc/process-types'
import { buildFooter } from '@/lib/utils/footer'
import React from 'react'

interface ProcessFooterProps {
    prompt: string
    pDadosDoProcesso: Promise<DadosDoProcessoType>
}

const ProcessFooter = async ({ prompt, pDadosDoProcesso }: ProcessFooterProps) => {
    const { model } = await getSelectedModelParams()

    const dadosDoProcesso = await pDadosDoProcesso
    if (!dadosDoProcesso || dadosDoProcesso.errorMsg) return null
    const pecasComConteudo = await getPiecesWithContent(dadosDoProcesso, dadosDoProcesso.numeroDoProcesso)
    try {
        await waitForTexts({ textos: pecasComConteudo })
    } catch (error) {
        return ''
    }

    const tipoDeSintese = dadosDoProcesso.tipoDeSintese
    const tipoDeSinteseNome = TipoDeSinteseMap[tipoDeSintese]?.nome || 'não definida'

    const footerHtml = `A síntese ${tipoDeSinteseNome} ${buildFooter(model, pecasComConteudo)?.toLowerCase()}`

    return (
        <p
            style={{ textAlign: 'center' }}
            dangerouslySetInnerHTML={{ __html: footerHtml }}
        />
    )
}

export default ProcessFooter
