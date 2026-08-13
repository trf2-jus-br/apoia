import { useState, useEffect } from "react"
import { DadosDoProcessoType } from "@/lib/proc/process-types"
import { detectarFaseDoProcesso } from "@/lib/proc/combinacoes"
import { playClickSound } from "@/lib/sound"
import { useModeUrl } from "@/lib/utils/use-mode-url"

export interface UseProcessDataResult {
    numeroDoProcesso: string | null
    setNumeroDoProcesso: (numero: string | null) => void
    arrayDeDadosDoProcesso: DadosDoProcessoType[] | null
    dadosDoProcesso: DadosDoProcessoType | null
    idxProcesso: number
    setIdxProcesso: (idx: number) => void
    filtro: string | null
    setFiltro: (s : string | null) => void
    setDadosDoProcesso: (dados: DadosDoProcessoType | null) => void
    number: string
    setNumber: (number: string) => void
    tramFromUrl: number | null
    setTramFromUrl: (tram: number | null) => void
    toastMessage: (message: string, variant: string) => void
    faseAtual: string | undefined
    fases: string[] | undefined
}

export function useProcessData(
    toastMessage: (message: string, variant: string) => void
): UseProcessDataResult {
    const [numeroDoProcesso, setNumeroDoProcesso] = useState<string | null>(null)
    const [arrayDeDadosDoProcesso, setArrayDeDadosDoProcesso] = useState<DadosDoProcessoType[] | null>(null)
    const [idxProcesso, setIdxProcesso] = useState(0)
    const [filtro, setFiltro] = useState<string | null>(null)
    const [dadosDoProcesso, setDadosDoProcesso] = useState<DadosDoProcessoType | null>(null)
    const [number, setNumber] = useState<string>('')
    const [tramFromUrl, setTramFromUrl] = useState<number | null>(null)
    const [faseAtual, setFaseAtual] = useState<string | undefined>(undefined)
    const [fases, setFases] = useState<string[] | undefined>(undefined)

    const modeUrl = useModeUrl()

    useEffect(() => {
        if (number?.length === 20) {
            setNumeroDoProcesso(number)
        } else {
            setNumeroDoProcesso(null)
        }
    }, [number])

    const loadProcess = async (numeroDoProcesso: string) => {
        const response = await fetch(modeUrl(`/api/v1/process/${numeroDoProcesso}`))
        if (response.ok) {
            const data = await response.json()
            if (data.errorMsg) {
                toastMessage(data.errorMsg, 'danger')
                setArrayDeDadosDoProcesso(null)
                setDadosDoProcesso(null)
                setNumeroDoProcesso(null)
                return
            }
            setArrayDeDadosDoProcesso(data.arrayDeDadosDoProcesso)
            const idx = data.arrayDeDadosDoProcesso?.length > 1 
                ? data.arrayDeDadosDoProcesso?.length - 1 
                : 0
            setIdxProcesso(idx)
            const dadosDoProc = data.arrayDeDadosDoProcesso[idx]
            setDadosDoProcesso(dadosDoProc)
            playClickSound()
        }
    }

    useEffect(() => {
        if (numeroDoProcesso) {
            loadProcess(numeroDoProcesso)
        } else {
            setDadosDoProcesso(null)
            setArrayDeDadosDoProcesso(null)
            setIdxProcesso(0)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [numeroDoProcesso])

    useEffect(() => {
        if (!dadosDoProcesso) {
            setFaseAtual(undefined)
            setFases(undefined)
            return
        }
        
        if (tramFromUrl !== null && arrayDeDadosDoProcesso?.length > 1) {
            if (tramFromUrl >= 0 && tramFromUrl < arrayDeDadosDoProcesso.length) {
                setIdxProcesso(tramFromUrl)
                setDadosDoProcesso(arrayDeDadosDoProcesso[tramFromUrl])
            }
            setTramFromUrl(null)
        }

        // Detectar fase processual quando dadosDoProcesso estiver disponível
        const resultado = detectarFaseDoProcesso(
            dadosDoProcesso.pecas,
            dadosDoProcesso.movimentosEDocumentos
        )
        setFaseAtual(resultado.faseAtual)
        setFases(resultado.fases)
    }, [arrayDeDadosDoProcesso, dadosDoProcesso, tramFromUrl])

    return {
        numeroDoProcesso,
        setNumeroDoProcesso,
        arrayDeDadosDoProcesso,
        dadosDoProcesso,
        idxProcesso,
        setIdxProcesso,
        filtro,
        setFiltro,
        setDadosDoProcesso,
        number,
        setNumber,
        tramFromUrl,
        setTramFromUrl,
        toastMessage,
        faseAtual,
        fases
    }
}
