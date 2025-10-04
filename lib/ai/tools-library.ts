import { tool } from "ai"
import { UserType } from "../user"
import { z } from "zod"
import { Dao } from "../db/mysql"
import { IALibrary } from "../db/mysql-types"

export const getLibraryDocumentTool = (pUser: Promise<UserType>) => tool({
    description: 'Obtém o conteúdo de um ou mais documentos da biblioteca do usuário a partir dos IDs dos documentos.',
    inputSchema: z.object({
        documentIdArray: z.array(z.number()).describe('Os IDs dos documentos da biblioteca a serem obtidos.'),
    }),
    execute: async ({ documentIdArray }) => {
        try {
            // Get the documents from the database
            const documents: IALibrary[] = await Dao.getLibrariesByIds(documentIdArray)

            if (!documents || documents.length === 0) {
                return `Nenhum documento encontrado ou você não tem permissão para acessá-los.`
            }

            // Process each document and format them
            const formattedDocuments: string[] = []
            
            for (const doc of documents) {
                // Check if it's a binary file
                if (doc.kind === 'ARQUIVO' && doc.content_binary) {
                    formattedDocuments.push(`<library id="${doc.id}" title="${doc.title}">O documento é um arquivo binário e não pode ser processado como texto.</library>`)
                    continue
                }

                // Check if there's markdown content
                if (!doc.content_markdown) {
                    formattedDocuments.push(`<library id="${doc.id}" title="${doc.title}">O documento não possui conteúdo de texto.</library>`)
                    continue
                }

                // Format the document with XML-like tags
                formattedDocuments.push(`<library id="${doc.id}" title="${doc.title}">${doc.content_markdown}</library>`)
            }

            // Return all formatted documents joined together
            return formattedDocuments.join('\n\n')
        } catch (error) {
            console.error('Error executing getLibraryDocumentTool:', error)
            return `Erro ao obter documento ${documentIdArray}: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
    }
})
