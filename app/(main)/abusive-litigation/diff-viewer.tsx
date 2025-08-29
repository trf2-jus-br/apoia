'use client'

import { DiffWords } from 'react-diff-components'
import { Modal, Button } from 'react-bootstrap'

const DiffViewer = ({ show, onClose, from, to }: { show: boolean, onClose: () => void, from: string, to: string }) => {
    return (
        <>
            <Modal show={show} onHide={onClose} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Diferenças</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div>
                        <DiffWords from={from} to={to} />
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onClose}>
                        Fechar
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default DiffViewer;