import { tua } from '@/lib/proc/tua'
import { DadosDoProcessoType } from "@/lib/proc/process-types"
import { ReactNode } from 'react'
import { formatBrazilianDate, maiusculasEMinusculas, maiusculasEMinusculasOuSigla } from '@/lib/utils/utils'

export const Subtitulo = ({ dadosDoProcesso }: { dadosDoProcesso: DadosDoProcessoType }) => {
    const ajuizamento = dadosDoProcesso?.ajuizamento
    const nomeDaClasse = tua[dadosDoProcesso?.codigoDaClasse]
    const poloAtivo = dadosDoProcesso?.poloAtivo
    const poloPassivo = dadosDoProcesso?.poloPassivo

    if (!ajuizamento || !nomeDaClasse) return <></>

    // return SubtituloLoading()

    return (<>
        {nomeDaClasse
            ? <div className="text-center">{nomeDaClasse}</div>
            : ''}
        {poloAtivo && poloPassivo
            ? <div className="text-center">{`${maiusculasEMinusculasOuSigla(poloAtivo)}  x  ${maiusculasEMinusculasOuSigla(poloPassivo)}`}</div>
            : ''}
        {ajuizamento
            ? <div className="text-center">{`Ajuizado em ${formatBrazilianDate(ajuizamento)}`}</div>
            : ''}
    </>
    )
}

export const SubtituloLoading = () => {
    return <div className="placeholder-glow" aria-hidden="true">
        <div className="row justify-content-center">
            <div className="col-4"><div className="placeholder w-100"></div></div>
        </div>
        <div className="row justify-content-center">
            <div className="col-2"><div className="placeholder w-100"></div></div>
        </div>
    </div>
}

export default Subtitulo
