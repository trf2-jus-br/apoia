'use server'

/**
 * Server actions for resolving prompt definitions from the database.
 * 
 * These are used by client components ('use client') that cannot directly
 * call async database functions. The parent server component should prefer
 * resolving definitions and passing them as props when possible.
 * 
 * Use these server actions only when the prompt slug is determined
 * dynamically at runtime (e.g., in event handlers).
 */
import { getPromptDefinition, getPromptDefinitionByUuid } from './prompt-store'
import { PromptDataType, PromptDefinitionType, GeneratedContent } from './prompt-types'
import { IAPrompt } from '../db/mysql-types'
import { PecaType } from '../proc/process-types'
import { promptExecuteBuilder } from './prompt'
import { buildRequests } from './build-requests'

/**
 * Resolve a prompt definition by slug. Callable from client components.
 */
export async function resolvePromptDefinition(slug: string): Promise<PromptDefinitionType> {
    return getPromptDefinition(slug)
}

/**
 * Resolve a prompt definition by UUID. Callable from client components.
 */
export async function resolvePromptDefinitionByUuid(uuid: string): Promise<PromptDefinitionType> {
    return getPromptDefinitionByUuid(uuid)
}

/**
 * Server action wrapper for promptExecuteBuilder.
 * Returns only { role, content } messages (serializable) — params are stripped since client callers only need messages.
 */
export async function serverPromptExecuteBuilder(
    definition: PromptDefinitionType,
    data: PromptDataType,
    libraryPrompt?: string
): Promise<{ message: { role: string, content: any }[], fixedPrompt: string }> {
    const exec = await promptExecuteBuilder(definition, data, libraryPrompt)
    return {
        message: exec.message.map(m => ({ role: (m as any).role, content: (m as any).content })),
        fixedPrompt: exec.fixedPrompt
    }
}

/**
 * Server action wrapper for buildRequests.
 * Callable from client components that need to resolve prompt definitions for request building.
 */
export async function serverBuildRequests(
    prompt: IAPrompt,
    documentosDaBiblioteca: string[] | undefined,
    numeroDoProcesso: string,
    selectedPieces: PecaType[],
    contents?: { [key: number]: string }
): Promise<GeneratedContent[]> {
    return buildRequests(prompt, documentosDaBiblioteca, numeroDoProcesso, selectedPieces, contents)
}
