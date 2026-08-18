'use client'

import TableRecords from '@/components/table-records'
import { Container, Tab, Tabs, Toast, ToastContainer } from 'react-bootstrap'
import { useEffect, useState } from 'react'
import axios from 'axios'
import ModeLink from '@/components/mode-link'
import { playErrorSound } from '@/lib/sound'
import { getDocumentsComunidade, getDocumentsPrincipais } from './utils/libraryFilters'

// Componente a nível de módulo (padrão de PromptsTable): instância estável entre
// renders de Contents, preservando paginação/ordenação ao atualizar favoritos.
function LibraryTable({ records, onClick, isModerator }: { records: any[], onClick: (kind: string, row: any) => void, isModerator: boolean }) {
    return (
        <TableRecords
            records={records}
            spec="Library"
            pageSize={10}
            onClick={onClick}
            options={{ isModerator }}
        >
            <div className="col col-auto mt-3 mb-0">
                <ModeLink prefetch={false} href="/library/new?kind=MARKDOWN" className="btn btn-primary">Criar Documento</ModeLink>
            </div>
        </TableRecords>
    )
}

export default function Contents({ items, isModerator }: { items: any[], isModerator: boolean }) {
    const [activeTab, setActiveTab] = useState('principal')
    const [showToast, setShowToast] = useState(false)
    const [toastMessage, setToastMessage] = useState('')
    const [toastVariant, setToastVariant] = useState('success')

    // Cópia local sincronizada com a prop do Server Component, para refletir
    // favoritar/desfavoritar otimistamente sem recarregar a página (padrão de prompts).
    const [itemsState, setItemsState] = useState(items)
    useEffect(() => { setItemsState(items) }, [items])

    const toast = (message: string, variant: string = 'success') => {
        setToastMessage(message)
        setToastVariant(variant)
        setShowToast(true)
    }

    const handleOnClick = async (kind: string, row: any) => {
        switch (kind) {
            case 'favoritar':
                try {
                    if (row.action === 'set') {
                        await axios.post(`/api/v1/library/${row.uuid}/favorite`)
                    } else if (row.action === 'reset') {
                        await axios.delete(`/api/v1/library/${row.uuid}/favorite`)
                    }

                    setItemsState(prevItems =>
                        prevItems.map(d =>
                            d.uuid === row.uuid
                                ? {
                                    ...d,
                                    is_favorite: row.action === 'set' ? 1 : 0,
                                    favorite_count: Number(d.favorite_count || 0) + (row.action === 'set' ? 1 : -1)
                                }
                                : d
                        )
                    )
                } catch (error) {
                    console.error('Error updating favorite status:', error)
                    playErrorSound()
                    toast('Erro ao atualizar favoritos', 'danger')
                }
                break
            case 'copiar link para compartilhar': {
                const link = `${window.location.origin}/library/${row.uuid}/set-favorite`
                navigator.clipboard.writeText(`Clique no link abaixo para adicionar o documento "${row.title}" à sua biblioteca:\n\n${link}`)
                toast('Link de compartilhamento copiado!')
                break
            }
        }
    }

    return (
        <Container className="mt-5 mb-3" fluid={false}>
            <h1 className="mb-3">Biblioteca</h1>
            <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k || 'principal')}
                className="mt-3"
            >
                <Tab eventKey="principal" title={<span>Pr<u>i</u>ncipais</span>} tabAttrs={{ accessKey: "i" }}>
                    <LibraryTable records={getDocumentsPrincipais(itemsState)} onClick={handleOnClick} isModerator={isModerator} />
                </Tab>

                <Tab eventKey="comunidade" title={<span>Documentos Não <u>A</u>valiados</span>} tabAttrs={{ accessKey: "a" }}>
                    <LibraryTable records={getDocumentsComunidade(itemsState)} onClick={handleOnClick} isModerator={isModerator} />
                    <div className="alert alert-warning mt-3">
                        <p className="mb-0">
                            <strong>Atenção:</strong> Os documentos não avaliados são compartilhados publicamente por outros usuários.
                            Esses documentos não passam por nenhum tipo de validação e podem conter informações imprecisas
                            ou inadequadas para seu contexto.
                        </p>
                    </div>
                </Tab>
            </Tabs>

            <ToastContainer position="bottom-end" className="p-3">
                <Toast onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide bg={toastVariant} title="Atenção">
                    <Toast.Body className={toastVariant !== 'Light' && 'text-white'}>{toastMessage}</Toast.Body>
                </Toast>
            </ToastContainer>
        </Container>
    )
}
