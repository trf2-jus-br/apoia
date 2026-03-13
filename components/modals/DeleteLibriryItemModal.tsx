import { Button } from "react-bootstrap";
import Modal from "react-bootstrap/esm/Modal";


export function DeleteLibraryItemModal({ show, title, onClose, onConfirm }: { show: boolean, title: string, onClose: () => void, onConfirm: () => void }) {
  return (
    <Modal show={show} onHide={onClose}>
        <Modal.Header closeButton>
            <Modal.Title>Deletar item</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <p>Tem certeza que deseja excluir este item da biblioteca?</p>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button variant="danger" onClick={() => { onConfirm(); onClose(); }}>Excluir</Button>
        </Modal.Footer>
    </Modal>
  )
}