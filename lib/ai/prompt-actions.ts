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
import { PromptDataType, PromptDefinitionType } from './prompt-types'
import { promptExecuteBuilder } from './prompt'

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

