'use client'

import { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { TicketFormModal } from './ticket-form';

export default function ErrorSpan({ encrypted }: { encrypted?: string }) {
    const [showModal, setShowModal] = useState(false);
    const [showTicketForm, setShowTicketForm] = useState(false);

    if (!encrypted) return null;

    const copyErrorToClipboard = () => {
        navigator.clipboard.writeText(encrypted)
            .then(() => {
                // Copied successfully
            })
            .catch(err => {
                // Handle error
            });
    };

    return (
        <>
            <button
                type="button"
                className="btn btn-link text-danger p-0"
                onClick={() => setShowModal(true)}
            >
                Ocorreu um erro, clique aqui para ver detalhes
            </button>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Detalhes do Erro</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div style={{ marginBottom: 16 }}>
                        Abra um chamado para que o suporte receba os detalhes do erro automaticamente.
                        Se preferir, copie o texto abaixo e envie para o suporte.
                    </div>
                    <Form.Control
                        as="textarea"
                        value={encrypted}
                        readOnly
                        rows={4}
                        aria-label="Detalhes técnicos do erro"
                        style={{ fontFamily: 'monospace', marginBottom: 16 }}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Fechar
                    </Button>
                    <Button variant="outline-primary" onClick={copyErrorToClipboard}>
                        Copiar
                    </Button>
                    <Button variant="primary" onClick={() => { setShowModal(false); setShowTicketForm(true) }}>
                        Abrir chamado
                    </Button>
                </Modal.Footer>
            </Modal>

            <TicketFormModal
                show={showTicketForm}
                onHide={() => setShowTicketForm(false)}
                kind="ERRO"
                encryptedErrorContext={encrypted}
            />
        </>
    );
}
