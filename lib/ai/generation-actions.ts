'use server'

/**
 * Server actions para avaliações de gerações de IA (thumbs-down).
 *
 * `lib/ai/generate.ts` é `server-only` (não pode ser importado por Client
 * Components nem exposto como 'use server', que tornaria todas as funções
 * invocáveis por RPC). Este arquivo é a ponte deliberada e mínima para o
 * Client Component que registra avaliações (`components/ai-content.tsx`).
 */
import { evaluate } from './generate'
import { PromptDataType, PromptDefinitionType } from './prompt-types'

/**
 * Registra a avaliação de uma geração. Callable from client components.
 * `definition`/`data` só são usados no fallback legado quando `generationId`
 * não está disponível nos metadados da mensagem.
 */
export async function evaluateGeneration(
    definition: PromptDefinitionType,
    data: PromptDataType,
    evaluation_id: number,
    evaluation_descr: string | null,
    generationId?: number
): Promise<boolean> {
    return evaluate(definition, data, evaluation_id, evaluation_descr, generationId)
}
