'use client'

import { maiusculasEMinusculas } from '@/lib/utils/utils'
import { GeneratedContent, PromptDefinitionType } from '@/lib/ai/prompt-types'
import { FormHelper } from '@/lib/ui/form-support'
import { DadosDoProcessoType } from '@/lib/proc/process-types'
import { promptExecuteBuilder } from '@/lib/ai/prompt'

const Frm = new FormHelper(true)

export const PromptParaCopiar = ({ dadosDoProcesso, requests }: { dadosDoProcesso: DadosDoProcessoType, requests: GeneratedContent[] }) => {
    if (!dadosDoProcesso || dadosDoProcesso.errorMsg) return ''

    const request = requests[requests.length - 2]
    const prompt: PromptDefinitionType = request.internalPrompt

    const exec = promptExecuteBuilder(prompt, request.data)

    const s: string = exec.message.map(m => m.role === 'system' ? `# PROMPT DE SISTEMA\n\n${m.content}\n\n# PROMPT` : m.content).join('\n\n')

    navigator.clipboard.writeText(s)

    return <>
        <p className="alert alert-warning text-center">Prompt copiado para a área de transferência, já com o conteúdo das peças relevantes!</p>
        <h2>{maiusculasEMinusculas(request.title)}</h2>
        <textarea name="prompt" className="form-control" rows={20}>{s}</textarea>
    </>
}


