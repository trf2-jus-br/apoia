import { IALibraryList } from "@/lib/db/mysql-types"

// Documentos PADRAO da Apoia e os proprios do usuario.
export function getDocumentsPrincipais(documents: IALibraryList[]): IALibraryList[] {
    return documents.filter((d) => d.share === 'PADRAO' || d.is_mine)
}

// Documentos compartilhados por outros usuarios (sem curadoria da Apoia).
export function getDocumentsComunidade(documents: IALibraryList[]): IALibraryList[] {
    return documents.filter((d) => !d.is_mine && d.share !== 'PADRAO')
}
