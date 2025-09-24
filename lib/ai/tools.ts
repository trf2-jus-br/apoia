import { tool } from "ai"
import { assertCourtId, UserType } from "../user"
import { getInteropFromUser } from "../proc/process"
import { TextoType } from "./prompt-types"
import { slugify } from "../utils/utils"
import { formatText } from "./prompt"
import { z } from "zod"
import { Interop, ObterPecaType } from "../interop/interop"
import { InteropProcessoType } from "../interop/interop-types"
import { getPrecedentTool } from "./tools-juris"
import { cookies } from "next/headers"
import { anonymizeText } from "../anonym/anonym"
import { isAllowedUser } from "../utils/env"
import { assertAnonimizacaoAutomatica } from "../proc/sigilo"

const anonymizeRecursively = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(item => anonymizeRecursively(item));
    }
    if (data !== null && typeof data === 'object') {
        return Object.entries(data).reduce((acc, [key, value]) => {
            acc[key] = anonymizeRecursively(value);
            return acc;
        }, {} as { [key: string]: any });
    }
    if (typeof data === 'string') {
        return anonymizeText(data, { endereco: true, email: true, names: true }).text;
    }
    return data;
};

export const getProcessMetadata = async (processNumber: string, interop: Interop): Promise<InteropProcessoType[]> => {
    const processMetadata = await interop.consultarMetadadosDoProcesso(processNumber)
    if (!processMetadata || !processMetadata.length) {
        throw new Error(`Não foi possível obter os metadados do processo ${processNumber}.`)
    }
    return processMetadata
    // const dadosDoProcesso = await obterDadosDoProcesso({ numeroDoProcesso: processNumber, pUser, conteudoDasPecasSelecionadas: CargaDeConteudoEnum.NAO })
    // return dadosDoProcesso
}

export const getProcessMetadataTool = (pUser: Promise<UserType>) => tool({
    description: 'Obtém os metadados de um processo judicial a partir do número do processo.',
    inputSchema: z.object({
        processNumber: z.string().describe('O número do processo.'),
    }),
    execute: async ({ processNumber }) => {
        try {
            processNumber = processNumber.trim().replace(/[^0-9]/g, '')
            const interop = await getInteropFromUser(await pUser)
            let metadata = await getProcessMetadata(processNumber, interop)

            // Anonymize metadata if the cookie is set
            const cookiesList = await (cookies());
            const anonymize = cookiesList.get('anonymize')?.value === 'true'
            for (const processo of metadata) {
                const sigilo = processo.informacoesGerais.nivelSigilo
                if (anonymize || assertAnonimizacaoAutomatica(sigilo)) {
                    processo.partes = anonymizeRecursively(processo.partes);
                    for (const parte of processo.partes?.poloAtivo || []) {
                        if (parte.representantes) {
                            for (const rep of parte.representantes) {
                                delete rep.oab
                            }
                        }
                    }
                    for (const parte of processo.partes?.poloPassivo || []) {
                        if (parte.representantes) {
                            for (const rep of parte.representantes) {
                                delete rep.oab
                            }
                        }
                    }
                    for (const movimento of processo.movimentosEDocumentos) {
                        movimento.documentos = movimento.documentos.map(doc => ({
                            ...doc,
                            nome: anonymizeText(doc.nome, { endereco: true, email: true, names: true }).text,
                            signatarios: doc.signatarios.map(sig => anonymizeText(sig, { endereco: true, email: true, names: true }).text)
                        }));
                    }
                }
            }
            return metadata
        } catch (error) {
            console.error('Error executing getProcessMetadataTool:', error)
            return `Error fetching metadata for process ${processNumber}: ${error instanceof Error ? error.message
                : 'Unknown error'}`
        }
    }
})

export const getPieceContentTool = (pUser: Promise<UserType>) => tool({
    description: 'Obtém o conteúdo de uma ou mais peças processuais a partir do número do processo e dos identificadores das peças.',
    inputSchema: z.object({
        processNumber: z.string().describe('O número do processo.'),
        pieceIdArray: z.array(z.string()).describe('Os identificadores das peças processuais a serem obtidas.'),
    }),
    execute: async ({ processNumber, pieceIdArray }) => {
        try {
            const decoder = new TextDecoder('utf-8')
            const interop = await getInteropFromUser(await pUser)
            const pMetadata = getProcessMetadata(processNumber, interop)
            const pPecas: Promise<ObterPecaType>[] = []
            for (const pieceId of pieceIdArray) {
                if (!pieceId || !pieceId.trim()) {
                    return `Identificador de peça inválido: ${pieceId}`
                }
                if (!/^[a-zA-Z0-9-]+$/.test(pieceId)) {
                    return `Identificador de peça inválido: ${pieceId}. Deve conter apenas letras, números e hífens.`
                }
                pPecas.push(interop.obterPeca(processNumber, pieceId, false))
            }
            const pecas = await Promise.all(pPecas)
            const metadata: InteropProcessoType[] = await pMetadata
            const pecasComConteudo: TextoType[] = await Promise.all(pecas.map(async (p, index) => {
                const pieceId = pieceIdArray[index]

                // Find the document in metadata that matches this pieceId
                let documentInfo = null
                for (const processo of metadata) {
                    for (const movimento of processo.movimentosEDocumentos) {
                        const doc = movimento.documentos.find(d => d.id === pieceId)
                        if (doc) {
                            documentInfo = { doc, movimento, processo }
                            break
                        }
                    }
                    if (documentInfo) break
                }

                if (!documentInfo)
                    throw new Error(`Não foi possível encontrar metadados para a peça ${pieceId} do processo ${processNumber}.`)

                // Extract text from the buffer
                let texto = decoder.decode(p.buffer)
                const descr = documentInfo?.doc?.tipoDocumento
                const label = documentInfo?.doc?.descricao
                const event = documentInfo?.movimento?.sequencia
                const sigilo = documentInfo?.doc?.nivelSigilo

                // Anonymize text if the cookie is set
                const cookiesList = await (cookies());
                const anonymize = cookiesList.get('anonymize')?.value === 'true'

                if (anonymize || assertAnonimizacaoAutomatica(sigilo)) {
                    texto = anonymizeText(texto).text
                }

                return {
                    id: pieceId,
                    numeroDoProcesso: processNumber,
                    idOrigem: pieceId,
                    event,
                    label,
                    descr,
                    slug: slugify(descr),
                    texto,
                    sigilo
                }
            }))
            const result = pecasComConteudo.map(p => formatText(p)).join('\n\n')
            return result || `Não foi possível obter o conteúdo das peças ${pieceIdArray.join(', ')} do processo ${processNumber}`
        } catch (error) {
            console.error('Error executing getPieceContentTool:', error)
            return `Error fetching content for process ${processNumber}, pieces ${pieceIdArray.join(', ')}: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
    },
})

export const getTools = async (pUser: Promise<UserType>) => {
    const toools = {
        getProcessMetadata: getProcessMetadataTool(pUser),
        getPiecesText: getPieceContentTool(pUser),
    }
    try {
        // Check if the user is allowed to access the precedent tool, must be TRF2 and have a specific CPF
        const user = await pUser
        const courtId = await assertCourtId(user)
        if (courtId === 999998 || courtId === 999999 || courtId === 4) {
            if (isAllowedUser(user.preferredUsername, courtId)) {
                (toools as any).getPrecedent = getPrecedentTool(pUser)
            }
        }
    } catch (error) {
        console.error('Error getting tools:', error)
    }
    return toools
}

