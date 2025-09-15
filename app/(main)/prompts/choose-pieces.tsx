'use client'

import { maiusculasEMinusculas } from "@/lib/utils/utils";
import { faClose, faEdit, faRotateRight, faSave } from "@fortawesome/free-solid-svg-icons";
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

function ChoosePiecesForm({ allPieces, selectedPieces, onSave, onClose, dossierNumber }: { allPieces: PecaType[], selectedPieces: PecaType[], onSave: (pieces: string[]) => void, onClose: () => void, dossierNumber: string }) {
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
                    <TableRecords records={[...allPieces].reverse()} spec="ChoosePieces" options={{dossierNumber}} pageSize={10} selectedIds={selectedIds} onSelectdIdsChanged={onSelectedIdsChanged}>
                        <div className="col col-auto mb-0">
                            {alteredPieces
                                ? <Button onClick={() => onSave(alteredPieces ? selectedIds : [])} variant="primary"><FontAwesomeIcon icon={faRotateRight} className="me-2" />Salvar Alterações e Refazer</Button>
                                : <Button onClick={() => onClose()} variant="secondary"><FontAwesomeIcon icon={faClose} className="me-1" />Fechar</Button>
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


export default function ChoosePieces({ allPieces, selectedPieces, onSave, onStartEditing, onEndEditing, dossierNumber }: { allPieces: PecaType[], selectedPieces: PecaType[], onSave: (pieces: string[]) => void, onStartEditing: () => void, onEndEditing: () => void, dossierNumber: string
 }) {       
    const pathname = usePathname(); // let's get the pathname to make the component reusable - could be used anywhere in the project
    const router = useRouter();
    const currentSearchParams = useSearchParams()
    const [editing, setEditing] = useState(false)
    const [reloading, setReloading] = useState(false)
    const ref = useRef(null)

    const onSaveLocal = (pieces: string[]) => {
        setEditing(false)
        // setReloading(true)
        onSave(pieces)
        onEndEditing()
    }

    const onClose = () => {
        setEditing(false)
        onEndEditing()
    }

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
    return <ChoosePiecesForm onSave={onSaveLocal} onClose={onClose} allPieces={allPieces} selectedPieces={selectedPieces} dossierNumber={dossierNumber} />
}