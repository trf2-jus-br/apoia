'use client'

import Table from '@/components/table-records'
import Link from 'next/link'
import { Toast, ToastContainer } from 'react-bootstrap'
import { useState } from 'react'
import ModeLink from '@/components/mode-link'

export default function Contents({ items }: { items: any[] }) {
    const [showToast, setShowToast] = useState(false)
    const [toastMessage, setToastMessage] = useState('')

    const handleOnClick = (kind: string, row: any) => {
        if (kind === 'copiar link para compartilhar') {
            const link = `${window.location.origin}/library/${row.id}/set-favorite`
            navigator.clipboard.writeText(`Clique no link abaixo para adicionar o documento "${row.title}" à sua biblioteca:\n\n${link}`)
            setToastMessage('Link de compartilhamento copiado!')
            setShowToast(true)
        }
    }

    return (
        <div className="container">
            <h1 className="mt-5 mb-3">Biblioteca</h1>
            <Table
                records={items}
                spec="Library"
                pageSize={10}
                onClick={handleOnClick}
            >
                <div className="col col-auto mt-3 mb-0">
                    <ModeLink prefetch={false} href="/library/new?kind=MARKDOWN" className="btn btn-primary">Criar Documento</ModeLink>
                </div>
            </Table>

            <ToastContainer position="bottom-end" className="p-3">
                <Toast onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide bg="success" title="Sucesso">
                    <Toast.Body className="text-white">{toastMessage}</Toast.Body>
                </Toast>
            </ToastContainer>
        </div>
    )
}
