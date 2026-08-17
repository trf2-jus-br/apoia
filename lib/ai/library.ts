import { LibraryDao } from "../db/dao"
import { IALibrary, IALibraryInclusion } from "../db/mysql-types"
import { defaultLibraryDocumentIds } from "./library-defaults"

/**
 * Obtém e formata os documentos da biblioteca do usuário atual para inclusão em prompts.
 * 
 * Documentos com inclusion='SIM' são incluídos com seu conteúdo completo.
 * Documentos com inclusion='CONTEXTUAL' são listados apenas com suas referências e contexto.
 * 
 * @returns String formatada com os documentos da biblioteca
 */
export async function getLibraryDocumentsForPrompt(promptSlug?: string, ids?: string[]): Promise<string> {
    try {
        const lib = await getLibraryDocuments(promptSlug, ids)

        let result = `# Biblioteca de Documentos do Usuário \n\n`

        // Adiciona documentos com inclusão automática
        if (lib.included.length > 0) {
            result += `Os seguintes documentos são referência obrigatória para execução da tarefa, o conteúdo completo de cada documento está disponível entre <library-document> e </library-document>:\n\n`
            result += lib.included
        } else {
            result += `O usuário não selecionou nenhum documento.\n\n`
        }

        // Adiciona documentos contextuais
        if (lib.available.length > 0) {
            result += `Os seguintes documentos estão disponíveis na biblioteca e devem ser carregados conforme o contexto da solicitação:\n\n`
            result += `<library-refs>\n`
            result += lib.available
            result += `</library-refs>\n`
        } else {
            result += `Não existem documentos disponíveis para serem incluídos em função do contexto.\n\n`
        }

        return result
    } catch (error) {
        console.error('Error getting library documents for prompt:', error)
        return ''
    }
}

export type LibraryDocumentsType = {
    included: string,
    available: string
}

export async function getLibraryDocuments(promptSlug?: string, ids?: string[]): Promise<LibraryDocumentsType> {
    try {
        const numericIds = ids ? ids.map(id => parseInt(id)).filter(id => !isNaN(id)) : undefined
        const safeNumericIds = numericIds || []

        // Busca documentos otimizados (sem binário, filtrados por ID/Inclusão)
        const documents = await LibraryDao.listLibraryForPrompt(numericIds)

        // Filtra documentos que têm conteúdo (já filtrado no banco, mas mantendo por segurança/tipagem)
        const validDocuments = documents.filter(doc => doc.content_markdown)

        // Sem seleção explícita, o default segue a mesma regra de prioridade do client
        // (inclusion=SIM próprio/favoritado + casamento de nome com o slug do prompt).
        const defaultIds = ids === undefined
            ? defaultLibraryDocumentIds(validDocuments, promptSlug).map(id => parseInt(id))
            : safeNumericIds

        // Separa documentos por tipo de inclusão
        const alwaysInclude = validDocuments.filter(doc => defaultIds.includes(doc.id))

        const contextualDocuments = validDocuments.filter(doc =>
            doc.inclusion === IALibraryInclusion.CONTEXTUAL && !defaultIds.includes(doc.id)
        )

        // Adiciona documentos com inclusão automática
        let included = ``
        if (alwaysInclude.length > 0) {
            for (const doc of alwaysInclude) {
                included += (await formatLibraryDocument(doc)) + '\n\n'
            }
        }

        // Adiciona documentos contextuais
        let available = ``
        if (contextualDocuments.length > 0) {
            for (const doc of contextualDocuments) {
                const context = doc.context ? ` context="${doc.context}"` : ''
                available += `<library-ref id="${doc.id}" title="${doc.title}"${context} />\n\n`
            }
        }

        return { included, available }
    } catch (error) {
        console.error('Error getting library documents for prompt:', error)
        return { included: '', available: '' }
    }
}

/**
 * Formata um documento da biblioteca para inclusão em prompts, incluindo seus anexos.
 * 
 * @param doc - Objeto contendo id, título e conteúdo markdown do documento
 * @returns String formatada com o documento e seus anexos
 */
export async function formatLibraryDocument(doc: { id: number, title: string, content_markdown: string | null }): Promise<string> {
    let docContent = doc.content_markdown || ''

    // Busca anexos do documento
    const attachments = await LibraryDao.getLibraryAttachmentsText(doc.id)
    if (attachments.length > 0) {
        for (const att of attachments) {
            if (att.content_text) {
                docContent += `\n\n<library-attachment filename="${att.filename}">\n${att.content_text}\n</library-attachment>`
            }
        }
    }

    return `<library-document title="${doc.title}">\n${docContent}\n</library-document>`
}


