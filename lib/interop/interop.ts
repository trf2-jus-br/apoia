import { number } from "zod"
import { DadosDoProcessoType } from "../proc/process-types"
import { InteropMNI } from "./mni"
import { InteropPDPJ } from "./pdpj"
import { InteropProcessoType } from "./interop-types"
import { systems } from '@/lib/utils/env'
import { InteropBalcaojus } from "./balcaojus"

export type ObterPecaType = { buffer: ArrayBuffer, contentType: string }

export interface Interop {
    init(): Promise<void>
    autenticar(system: string): Promise<boolean>
    consultarMetadadosDoProcesso(numeroDoProcesso: string): Promise<InteropProcessoType[]>
    consultarProcesso(numeroDoProcesso: string): Promise<DadosDoProcessoType[]>
    obterPeca(numeroDoProcesso: string, idDaPeca: string, binary?: boolean): Promise<ObterPecaType>
}

export const getInterop = (system: string, username: string, password: string): Interop => {
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