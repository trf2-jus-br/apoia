import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Modal, Spinner } from "react-bootstrap";
import { TreeView, type TreeNode } from "@/components/tree-view";
import { PecaType } from "@/lib/proc/process-types";

interface TreeModalProps {
    show: boolean;
    onClose: () => void;
    pieces: PecaType[];
    onSave: (pieces: string[]) => void;
    selectedIds: string[];
    onSelectedIdsChanged: (ids: string[]) => void;
}

export function TreeModal({ show, onClose, pieces, onSave, selectedIds, onSelectedIdsChanged }: TreeModalProps) {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [data, setData] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [leftWidth, setLeftWidth] = useState<number>(400);
    const [isResizing, setIsResizing] = useState<boolean>(false);
    const isResizingRef = useRef(false);
    const leftPaneRef = useRef<HTMLDivElement | null>(null);

    // Agrupar peças por número do evento
    const groupedByEvent = pieces.reduce((acc, piece) => {
        const eventNumber = piece.numeroDoEvento || 'Sem Evento';
        if (!acc[eventNumber]) {
            acc[eventNumber] = [];
        }
        acc[eventNumber].push(piece);
        return acc;
    }, {} as Record<string, PecaType[]>);

    // Construir tree data a partir das peças
    const treeData: TreeNode[] = Object.entries(groupedByEvent)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([eventNumber, piecesInEvent], eventIndex) => ({
        id: `evento-${eventIndex}`,
        label: `Evento ${eventNumber}`,
        children: piecesInEvent.map((piece) => ({
            id: piece.id,
            label: piece.descr,
            url: `/api/v1/process/${piece.numeroDoProcesso}/piece/${piece.id}/binary`,
            piece: piece
        }))
    }));

    async function fetchAndDisplayPDF(url: string) {
        try {
            setIsLoading(true);
            setData(null);

            // Construir URL absoluta para passar ao proxy
            const absoluteUrl = `${window.location.origin}${url}`;
            const response = await axios.get(`/api/pdf-proxy?url=${encodeURIComponent(absoluteUrl)}#toolbar=1&navpanes=1&scrollbar=1`, { 
                responseType: 'arraybuffer'
            });

            // Convert buffer to Blob URL
            const uint8Array = new Uint8Array(response.data);
            const blob = new Blob([uint8Array], { type: response.headers["content-type"] });
            const blobUrl = URL.createObjectURL(blob);

            // Get visibility flag from response header
            const isVisibleFlag = response.headers['x-visible']

            if(isVisibleFlag === 'false') {
                setData(null);
                setIsVisible(false);
            } else {
                setData(blobUrl);
                setIsVisible(true);
            }
        } catch (error) {
            console.error('Erro ao carregar PDF:', error);
            setIsVisible(false);
        } finally {
            setIsLoading(false);
        }
    }

    const handleNodeClick = (node: TreeNode) => {
        if (node.url) {
            setPdfUrl(node.url);
            fetchAndDisplayPDF(node.url);
        }
    };

    const handleCheckboxChange = (nodeId: string | number, checked: boolean) => {
        if (typeof nodeId !== 'string') return;

        const nextSet = new Set(selectedIds);
        if (checked) {
            nextSet.add(nodeId);
        } else {
            nextSet.delete(nodeId);
        }

        const newSelectedIds = Array.from(nextSet).sort((a, b) => a.localeCompare(b));
        onSelectedIdsChanged(newSelectedIds);
    };

    const handleCheckboxChangeBulk = (nodeIds: (string | number)[], checked: boolean) => {
        const nextSet = new Set(selectedIds);
        nodeIds.forEach((nodeId) => {
            if (typeof nodeId !== 'string') return;
            if (checked) {
                nextSet.add(nodeId);
            } else {
                nextSet.delete(nodeId);
            }
        });

        const newSelectedIds = Array.from(nextSet).sort((a, b) => a.localeCompare(b));
        onSelectedIdsChanged(newSelectedIds);
    };

    useEffect(() => {
        const handlePointerMove = (event: PointerEvent) => {
            if (!isResizingRef.current) return;
            const nextWidth = Math.max(280, Math.min(720, event.clientX));
            setLeftWidth(nextWidth);
        };

        const handlePointerUp = () => {
            if (isResizingRef.current) {
                isResizingRef.current = false;
                setIsResizing(false);
            }
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, []);

    useEffect(() => {
        if (!show) return;
        const pane = leftPaneRef.current;
        if (!pane) return;
        setTimeout(() => {
            pane.scrollTop = pane.scrollHeight;
        }, 0);
    }, [show]);

    return (
        <Modal 
            show={show} 
            onHide={onClose}
            dialogClassName="position-fixed top-0 left-0 w-100 h-100 p-0 m-0"
            contentClassName="border-0"
            backdropClassName="show"
        >
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#fff',
                borderRadius: 0
            }}>
                <Modal.Header closeButton style={{ flexShrink: 0 }}>
                    <Modal.Title>Árvore de Documentos</Modal.Title>
                </Modal.Header>
                
                <Modal.Body className="p-0" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* Seção Esquerda */}
                    <div
                        ref={leftPaneRef}
                        style={{
                            width: `${leftWidth}px`,
                            borderRight: '1px solid #dee2e6',
                            overflow: 'auto',
                            padding: '1rem'
                        }}>

                        <h5 style={{ whiteSpace: 'nowrap', justifyContent: 'flex-start', display: 'flex' }}>
                            Processo {pieces.length > 0 ? pieces[0].numeroDoProcesso : ''}
                        </h5>
                        <TreeView 
                            data={treeData}
                            onNodeClick={handleNodeClick}
                            onCheckboxChange={handleCheckboxChange}
                            onCheckboxChangeBulk={handleCheckboxChangeBulk}
                            checkedNodes={selectedIds}
                            renderLabel={(node) => (
                                <span style={{
                                    fontWeight: node.url ? 'normal' : 'bold',
                                    color: pdfUrl === node.url ? '#0d6efd' : 'inherit',
                                    cursor: node.url ? 'pointer' : 'default',
                                    whiteSpace: 'nowrap',
                                }}
                                onClick={() => handleNodeClick(node)}>
                                    {node.children && node.children.length > 0 
                                        ? `(${node.label.replace(/[E|e]vento\s/, '')}) - ${node.children[0].label.toLowerCase()} - 
                                        ${new Intl.DateTimeFormat('pt-BR', { 
                                            day: '2-digit', 
                                            month: '2-digit', 
                                            year: 'numeric', 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        }).format(new Date(node.children[0].piece.dataHora))}`
                                        : `${node.label}`
                                    }
                                </span>
                            )}
                        />
                    </div>

                    <div
                        onPointerDown={(event) => {
                            event.preventDefault();
                            isResizingRef.current = true;
                            setIsResizing(true);
                        }}
                        style={{
                            width: '6px',
                            cursor: 'col-resize',
                            background: 'transparent',
                            borderRight: '1px solid #dee2e6'
                        }}
                    />

                    {/* Seção Direita - PDF Viewer */}
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#f8f9fa'
                    }}>
                        {isLoading ? (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                padding: '2rem'
                            }}>
                                <p className="text-muted mb-3">Carregando documento...</p>
                                <Spinner animation="border" role="status" />
                            </div>
                        ) : pdfUrl ? 
                            (isVisible ? (
                                <iframe
                                    src={data}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        border: 'none',
                                        pointerEvents: isResizing ? 'none' : 'auto'
                                    }}
                                    title="PDF Viewer"
                                />
                            ) : (
                                <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: '#6c757d'
                            }}>
                                Não é possível visualizar este documento.
                            </div>
                            )
                        ) : (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: '#6c757d'
                            }}>
                                Nenhum documento selecionado
                            </div>
                        )}
                    </div>
                </Modal.Body>
            </div>
        </Modal>
    )
}