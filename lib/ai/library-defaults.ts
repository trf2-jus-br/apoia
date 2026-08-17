import { IALibraryInclusion, IALibraryList } from "../db/mysql-types"
import { slugify } from "../utils/utils"

// is_mine/is_favorite aceitam number|boolean porque vêm de raw SQL (pg devolve boolean, mysql number)
type LibraryDocumentForDefaults = {
    id: number
    title: string
    inclusion: IALibraryInclusion | null
    share: string
    is_mine: boolean | number
    is_favorite: boolean | number
}

/**
 * Regra central de auto-inclusao de documentos da biblioteca em um prompt:
 *
 * (a) todo documento proprio/favoritado com inclusion=SIM entra por padrao; e
 * (b) quando slugify(titulo) === slug do prompt, entra o documento casante de
 *     maior prioridade: proprio > favoritado > PADRAO da Apoia. Em colisao,
 *     apenas a categoria de maior prioridade entra; os demais seguem
 *     disponiveis para selecao manual em ChooseLibrary.
 *
 * Docs PADRAO/PUBLICO de terceiros nao entram automaticamente fora o casamento
 * de nome (evita injetar conteudo nao curado em prompts alheios).
 */
export function defaultLibraryDocumentIds(
    docs: LibraryDocumentForDefaults[],
    promptSlug?: string
): string[] {
    const ids = new Set<string>()

    for (const doc of docs) {
        if (doc.inclusion === IALibraryInclusion.SIM && (doc.is_mine || !!doc.is_favorite)) {
            ids.add(String(doc.id))
        }
    }

    if (promptSlug) {
        const matches = docs.filter(doc => slugify(doc.title) === promptSlug)
        if (matches.some(doc => doc.is_mine)) {
            matches.filter(doc => doc.is_mine).forEach(doc => ids.add(String(doc.id)))
        } else if (matches.some(doc => !!doc.is_favorite)) {
            matches.filter(doc => !!doc.is_favorite).forEach(doc => ids.add(String(doc.id)))
        } else if (matches.some(doc => doc.share === 'PADRAO')) {
            matches.filter(doc => doc.share === 'PADRAO').forEach(doc => ids.add(String(doc.id)))
        }
    }

    return Array.from(ids)
}

/**
 * Recorte do que o ChooseLibrary exibe para o prompt corrente: documentos
 * proprios, favoritados e PADRAO de terceiros cujo slug casa com o slug do
 * prompt (mesmo em colisao, permitindo marcar manualmente). Toda selecao
 * padrao (defaultLibraryDocumentIds) esta contida neste recorte.
 */
export function documentsForChooseLibrary(docs: IALibraryList[], promptSlug?: string): IALibraryList[] {
    return docs.filter(doc =>
        doc.is_mine ||
        !!doc.is_favorite ||
        (doc.share === 'PADRAO' && !!promptSlug && slugify(doc.title) === promptSlug)
    )
}
