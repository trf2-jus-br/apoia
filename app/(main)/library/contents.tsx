'use client'

import Table from '@/components/table-records'
import { Container, Tab, Tabs, Toast, ToastContainer } from 'react-bootstrap'
import { useState } from 'react'
import ModeLink from '@/components/mode-link'
import { getDocumentsComunidade, getDocumentsPrincipais } from './utils/libraryFilters'

export default function Contents({ items, isModerator }: { items: any[], isModerator: boolean }) {
    const [activeTab, setActiveTab] = useState('principal')
    const [showToast, setShowToast] = useState(false)
    const [toastMessage, setToastMessage] = useState('')

    const handleOnClick = (kind: string, row: any) => {
        if (kind === 'copiar link para compartilhar') {
            const link = `${window.location.origin}/library/${row.uuid}/set-favorite`
            navigator.clipboard.writeText(`Clique no link abaixo para adicionar o documento "${row.title}" à sua biblioteca:\n\n${link}`)
            setToastMessage('Link de compartilhamento copiado!')
            setShowToast(true)
        }
    }

    const TabelaDocumentos = ({ records }: { records: any[] }) => (
        <Table
            records={records}
            spec="Library"
            pageSize={10}
            onClick={handleOnClick}
            options={{ isModerator }}
        >
            <div className="col col-auto mt-3 mb-0">
                <ModeLink prefetch={false} href="/library/new?kind=MARKDOWN" className="btn btn-primary">Criar Documento</ModeLink>
            </div>
        </Table>
    )

    return (
        <Container className="mt-5 mb-3" fluid={false}>
            <h1 className="mb-3">Biblioteca</h1>
            <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k || 'principal')}
                className="mt-3"
            >
                <Tab eventKey="principal" title={<span>Pr<u>i</u>ncipais</span>} tabAttrs={{ accessKey: "i" }}>
                    <TabelaDocumentos records={getDocumentsPrincipais(items)} />
                </Tab>

                <Tab eventKey="comunidade" title={<span>Documentos Não <u>A</u>valiados</span>} tabAttrs={{ accessKey: "a" }}>
                    <TabelaDocumentos records={getDocumentsComunidade(items)} />
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
                <Toast onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide bg="success" title="Sucesso">
                    <Toast.Body className="text-white">{toastMessage}</Toast.Body>
                </Toast>
            </ToastContainer>
        </Container>
    )
}
