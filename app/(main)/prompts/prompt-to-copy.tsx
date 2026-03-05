'use client'

import { maiusculasEMinusculas } from '@/lib/utils/utils'
import { GeneratedContent, PromptDefinitionType } from '@/lib/ai/prompt-types'
import { FormHelper } from '@/lib/ui/form-support'
import { DadosDoProcessoType } from '@/lib/proc/process-types'
import { serverPromptExecuteBuilder } from '@/lib/ai/prompt-actions'
import { useEffect, useState } from 'react'

const Frm = new FormHelper(true)

export const PromptParaCopiar = ({ dadosDoProcesso, requests }: { dadosDoProcesso: DadosDoProcessoType, requests: GeneratedContent[] }) => {
    const [promptText, setPromptText] = useState<string | null>(null)

    useEffect(() => {
        if (!dadosDoProcesso || dadosDoProcesso.errorMsg) return
        const request = requests[requests.length - 2]
        const prompt: PromptDefinitionType = request.internalPrompt
        serverPromptExecuteBuilder(prompt, request.data).then(exec => {
            const s: string = exec?.message.map(m => m.role === 'system' ? `# PROMPT DE SISTEMA\n\n${m.content}\n\n# PROMPT` : m.content).join('\n\n')
            if (s) {
                navigator.clipboard.writeText(s)
                setPromptText(s)
            }
        })
    }, [dadosDoProcesso, requests])

    if (!dadosDoProcesso || dadosDoProcesso.errorMsg) return ''
    if (!promptText) return <div className="text-center my-3">Preparando prompt...</div>

    const request = requests[requests.length - 2]
    return <>
        <p className="alert alert-warning text-center">Prompt copiado para a area de transferencia, ja com o conteudo das pecas relevantes!</p>
        <h2>{maiusculasEMinusculas(request.title)}</h2>
        <textarea name="prompt" className="form-control" rows={20} defaultValue={promptText} />
    </>
}
