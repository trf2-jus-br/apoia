'use client'

import { maiusculasEMinusculas } from "@/lib/utils/utils";
import { faClose, faEdit, faPlay, faRotateRight, faSave } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { use, useEffect, useRef, useState } from "react"
import TableRecords from '@/components/table-records'
import { DadosDoProcessoType, PecaType, StatusDeLancamento } from "@/lib/proc/process-types";
import { Button } from "react-bootstrap";
import { TipoDeSinteseEnum, TipoDeSinteseMap } from "@/lib/proc/combinacoes";
import { EMPTY_FORM_STATE, FormHelper } from "@/lib/ui/form-support";
import { TiposDeSinteseValido } from "@/lib/proc/info-de-produto";
import { on } from "events";

const Frm = new FormHelper()

const canonicalPieces = (pieces: string[]) => pieces.sort((a, b) => a.localeCompare(b)).join(',')

function ChoosePiecesForm({ allPieces, selectedPieces, onSave, onClose, dossierNumber, readyToStartAI }: { allPieces: PecaType[], selectedPieces: PecaType[], onSave: (pieces: string[]) => void, onClose: () => void, dossierNumber: string, readyToStartAI }) {
    const originalPieces: string[] = selectedPieces.map(p => p.id)
    const [selectedIds, setSelectedIds] = useState(originalPieces)
    const [canonicalOriginalPieces, setCanonicalOriginalPieces] = useState(canonicalPieces(originalPieces))
    const tipos = TiposDeSinteseValido.map(tipo => ({ id: tipo.id, name: tipo.nome }))

    const onSelectedIdsChanged = (ids: string[]) => {
        if (canonicalPieces(ids) !== canonicalPieces(selectedIds))
            setSelectedIds(ids)
    }

    Frm.update({ selectedIds }, (d) => { setSelectedIds(d.selectedIds) }, EMPTY_FORM_STATE)

    const updateSelectedPieces = async () => {
        const res = await fetch('/api/v1/select-pieces', {
            method: 'post',
            body: JSON.stringify({
                pieces: allPieces.map(p => ({ id: p.id, descr: p.descr, numeroDoEvento: p.numeroDoEvento, descricaoDoEvento: p.descricaoDoEvento, sigilo: p.sigilo }))
            }),
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            cache: 'no-store'
        })
        const data = await res.json()
        setSelectedIds(data.selectedIds)
        setCanonicalOriginalPieces(canonicalPieces(data.selectedIds))
    }

    // useEffect(() => {
    //     updateSelectedPieces()
    // }, [])

    const alteredPieces = canonicalPieces(selectedIds) !== canonicalOriginalPieces

    return <div className="mt-4 mb-4 h-print">
        <div className="alert alert-warning pt-0">
            <div className="row">
                <div className="col-12">
                    <TableRecords records={[...allPieces].reverse()} spec="ChoosePieces" options={{ dossierNumber }} pageSize={10} selectedIds={selectedIds} onSelectdIdsChanged={onSelectedIdsChanged}>
                        <div className="col col-auto mb-0">
                            {alteredPieces
                                ? <Button onClick={() => onSave(alteredPieces ? selectedIds : [])} variant="primary" disabled={selectedIds.length === 0}><FontAwesomeIcon icon={faRotateRight} className="me-2" />Salvar Alterações e Refazer</Button>
                                : readyToStartAI
                                    ? <Button onClick={() => onClose()} variant="secondary"><FontAwesomeIcon icon={faClose} className="me-1" />Fechar</Button>
                                    : <Button onClick={() => onClose()} variant="primary" disabled={selectedIds.length === 0}><FontAwesomeIcon icon={faPlay} className="me-1" />Prosseguir</Button>
                            }
                        </div></TableRecords>
                </div>
            </div>
        </div>
    </div>
}

export const ChoosePiecesLoading = () => {
    return <div className="placeholder-glow">
        <div className="row justify-content-center">
            <div className="col-4"><div className="placeholder w-100"></div></div>
        </div>
    </div>
}


export default function ChoosePieces({ allPieces, selectedPieces, onSave, onStartEditing, onEndEditing, dossierNumber, readyToStartAI, baselineDefaultIds }: {
    allPieces: PecaType[], selectedPieces: PecaType[], onSave: (pieces: string[]) => void, onStartEditing: () => void, onEndEditing: () => void, dossierNumber: string, readyToStartAI: boolean, baselineDefaultIds: string[]
}) {
    const pathname = usePathname(); // let's get the pathname to make the component reusable - could be used anywhere in the project
    const router = useRouter();
    const currentSearchParams = useSearchParams()
    const [editing, setEditing] = useState(true)
    const [reloading, setReloading] = useState(false)
    const ref = useRef(null)
    // Track if current selection deviates from automatic default
    const [hasCustomSelection, setHasCustomSelection] = useState(false)
    // Avoid re-applying the same query-string to selection repeatedly
    const appliedPiecesParamRef = useRef<string>("")

    const PIECES_PARAM = 'pieces' // stores hyphen-separated 1-based indices (1..N) in original allPieces order

    // Helpers to convert between IDs and 1-based numbers (index in allPieces)
    const idsToNumbers = (ids: string[]): number[] => {
        const indexById = new Map(allPieces.map((p, idx) => [p.id, idx + 1]))
        const nums = ids.map(id => indexById.get(id)).filter((n): n is number => typeof n === 'number')
        // sort and unique
        const uniq = Array.from(new Set(nums))
        uniq.sort((a, b) => a - b)
        return uniq
    }

    const numbersToIds = (numbers: number[]): string[] => {
        const ids: string[] = []
        for (const n of numbers) {
            const idx = n - 1
            if (idx >= 0 && idx < allPieces.length) ids.push(allPieces[idx].id)
        }
        return ids
    }

    const canonicalNumbers = (numbers: number[]) => Array.from(new Set(numbers.filter(n => Number.isInteger(n) && n >= 1)) ).sort((a,b)=>a-b).join('-')

    const replacePiecesParam = (numbersOrNull: number[] | null) => {
        // Build new query string preserving other params
        const params = new URLSearchParams(currentSearchParams.toString())
        if (numbersOrNull && numbersOrNull.length > 0) {
            const value = canonicalNumbers(numbersOrNull)
            if (params.get(PIECES_PARAM) !== value) {
                params.set(PIECES_PARAM, value)
            }
        } else {
            if (params.has(PIECES_PARAM)) params.delete(PIECES_PARAM)
        }
        const qs = params.toString()
        const url = qs ? `${pathname}?${qs}` : pathname
        router.replace(url, { scroll: false })
    }

    const onSaveLocal = (pieces: string[]) => {
        setEditing(false)
        // setReloading(true)
        onSave(pieces)
        // If pieces is empty, it signals "no change" (keep default selection)
        if (!pieces || pieces.length === 0) {
            setHasCustomSelection(false)
            replacePiecesParam(null)
        } else {
            // User explicitly changed selection -> set query-string with piece numbers
            const nums = idsToNumbers(pieces)
            setHasCustomSelection(true)
            replacePiecesParam(nums)
        }
        onEndEditing()
    }

    // Baseline of automatically selected pieces (default) comes from parent
    const baselineDefaultIdsRef = useRef<string[] | null>(baselineDefaultIds || null)
    useEffect(() => { baselineDefaultIdsRef.current = baselineDefaultIds || null }, [baselineDefaultIds, dossierNumber])

    const onClose = () => {
        setEditing(false)
        // Clear param only if the current selection equals the automatic baseline; otherwise, preserve existing 'pecas'
        try {
            const baselineIds = baselineDefaultIdsRef.current || []
            const currentIds = (selectedPieces || []).map(p => p.id)
            const isDefaultNow = canonicalPieces(currentIds) === canonicalPieces(baselineIds)
            if (isDefaultNow) replacePiecesParam(null)
        } catch (_) {
            // In case of any inconsistency, avoid clearing to preserve user's selection
        }
        onEndEditing()
    }

    // Initial selection from URL moved to ProcessContents to avoid race conditions

    if (reloading) {
        return ChoosePiecesLoading()
    }

    if (!editing) {
        const l = selectedPieces?.map(p => maiusculasEMinusculas(p.descr)) || []
        let s = `Peças: `
        if (l.length === 0)
            s += 'Nenhuma peça selecionada'
        else if (l.length === 1) {
            s += l[0]
        } else if (l.length === 2) {
            const last = l.pop()
            s += `${l.join(', ')} e ${last}`
        } else {
            s += l[0] + ' + ' + (l.length - 1)
        }
        return <p className="text-body-tertiary text-center h-print">{s} - <span onClick={() => { setEditing(true); onStartEditing() }} className="text-primary" style={{ cursor: 'pointer' }}><FontAwesomeIcon icon={faEdit} /> Alterar</span></p>
    }
    return <ChoosePiecesForm onSave={onSaveLocal} onClose={onClose} allPieces={allPieces} selectedPieces={selectedPieces} dossierNumber={dossierNumber} readyToStartAI={readyToStartAI} />
}