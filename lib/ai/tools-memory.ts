import { tool } from "ai"
import { UserType } from "../user"
import { z } from "zod"
import { getMemoryAsMarkdownString, setMemoryAsMarkdownString } from "./library"

/**
 * Adiciona um novo fato ao final da memória ou sob um título específico.
 */
export const addMemoryTool = (pUser: Promise<UserType>) => tool({
    description: 'Adiciona uma nova informação ou fato à memória do usuário.',
    inputSchema: z.object({
        fact: z.string().describe('O fato ou informação em formato markdown (ex: "- O usuário prefere scripts em TS.")'),
        section: z.string().optional().describe('O título da seção onde o fato deve ser inserido (ex: "Preferências").')
    }),
    execute: async ({ fact, section }) => {
        try {
            await pUser
            let currentMemory = await getMemoryAsMarkdownString()
            const timestamp = new Date().toLocaleDateString('pt-BR')
            const entry = `${fact} (Registrado em: ${timestamp})\n`

            if (section && currentMemory.includes(`## ${section}`)) {
                currentMemory = currentMemory.replace(`## ${section}`, `## ${section}\n${entry}`)
            } else {
                currentMemory += `\n${section ? `## ${section}\n` : ''}${entry}`
            }

            await setMemoryAsMarkdownString(currentMemory.trim())
            return 'Fato adicionado à memória com sucesso.'
        } catch (error) {
            console.error('Error executing addFactTool:', error)
            return `Erro ao adicionar fato à memória: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
    },
})

/**
 * Atualiza ou remove um trecho específico da memória usando busca e substituição.
 */
export const updateMemoryTool = (pUser: Promise<UserType>) => tool({
    description: 'Atualiza ou remove uma informação existente na memória.',
    inputSchema: z.object({
        searchString: z.string().describe('O texto exato que deve ser substituído ou removido.'),
        replacementString: z.string().describe('O novo texto. Deixe vazio se o objetivo for apenas remover.'),
    }),
    execute: async ({ searchString, replacementString }) => {
        try {
            await pUser
            const currentMemory = await getMemoryAsMarkdownString()
            
            if (!currentMemory.includes(searchString)) {
                return 'Erro: O texto de busca não foi encontrado na memória exatamente como fornecido.'
            }

            const newMemory = currentMemory.replace(searchString, replacementString)
            await setMemoryAsMarkdownString(newMemory.trim())
            return 'Memória atualizada com sucesso.'
        } catch (error) {
            console.error('Error executing updateFactTool:', error)
            return `Erro ao atualizar memória: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
    },
})

/**
 * Substitui todo o conteúdo da memória por uma versão reorganizada.
 */
export const consolidateMemoryTool = (pUser: Promise<UserType>) => tool({
    description: 'Reorganiza, limpa e formata toda a memória do usuário para remover redundâncias.',
    inputSchema: z.object({
        fullMarkdown: z.string().describe('O conteúdo completo e novo da memória em Markdown.'),
    }),
    execute: async ({ fullMarkdown }) => {
        try {
            await pUser
            await setMemoryAsMarkdownString(fullMarkdown.trim())
            return 'Memória consolidada e reorganizada com sucesso.'
        } catch (error) {
            console.error('Error executing consolidateMemoryTool:', error)
            return `Erro ao consolidar memória: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
    },
})