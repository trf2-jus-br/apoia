import { number } from "zod"
import { DadosDoProcessoType } from "../proc/process-types"
import { InteropMNI } from "./mni"
import { InteropPDPJ } from "./pdpj"
import { InteropProcessoType } from "./interop-types"
import { systems } from '@/lib/utils/env'
import { InteropBalcaojus } from "./balcaojus"
import { InteropSEI } from "./sei"

export type ObterPecaType = { buffer: ArrayBuffer, contentType: string }

export interface Interop {
    init(): Promise<void>
    autenticar(system: string): Promise<boolean>
    consultarMetadadosDoProcesso(numeroDoProcesso: string): Promise<InteropProcessoType[]>
    consultarProcesso(numeroDoProcesso: string): Promise<DadosDoProcessoType[]>
    obterPeca(numeroDoProcesso: string, idDaPeca: string, binary?: boolean): Promise<ObterPecaType>
}

// Resolve qual interop instanciar. No modo administrativo, usa o SEI; a
// resolução de SEI_API_URL (eventualmente prefixada por tribunal) e do token
// acontece dentro de InteropSEI.init(), a partir de getCurrentUser(), como o
// InteropPDPJ já faz. Caso contrário, cai no fluxo existente por system.kind.
export const getInterop = (system: string, username: string, password: string, mode?: string): Interop => {
    if (mode === 'ADMINISTRATIVO') {
        return new InteropSEI()
    }
    const currentSystem = systems.find(s => s.system === system)
    switch (currentSystem?.kind) {
        case 'MNI':
            // if (!username || !password)
            //     return new InteropPDPJ()
            return new InteropMNI(username, password)
        case 'BALCAOJUS':
            return new InteropBalcaojus(system, username, password)
        default:
            return new InteropPDPJ()
    }
}

export const fixSigiloDePecas = (dadosDoProcesso: DadosDoProcessoType[]): DadosDoProcessoType[] => {
    if (!dadosDoProcesso) return dadosDoProcesso
    // Ajusta o sigilo das peças para que todas as peças do processo tenham o sigilo igual ou maior ao sigilo do processo
    for (const processo of dadosDoProcesso) {
        const nivelDoProcesso = parseInt(processo.sigilo || '0')
        for (const peca of processo.pecas) {
            const nivelDaPeca = parseInt(peca.sigilo || '0')
            if (nivelDaPeca < nivelDoProcesso)
                peca.sigilo = nivelDoProcesso.toString()
        }
    }
    return dadosDoProcesso
}