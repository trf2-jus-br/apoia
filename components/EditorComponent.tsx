"use client";

import React, { FC } from "react";
import showdown from "showdown";
import {
    MDXEditor,
    MDXEditorMethods,
    headingsPlugin,
    listsPlugin,
    quotePlugin,
    thematicBreakPlugin,
    markdownShortcutPlugin,
    toolbarPlugin,
    BoldItalicUnderlineToggles,
    BlockTypeSelect,
    DiffSourceToggleWrapper,
    diffSourcePlugin,
    codeMirrorPlugin,
} from "@mdxeditor/editor";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faFilePdf } from "@fortawesome/free-solid-svg-icons";
import { Toast, ToastContainer, Spinner } from "react-bootstrap";
import { set } from "lodash";

interface EditorProps {
    markdown: string;
    editorRef?: React.MutableRefObject<MDXEditorMethods | null>;
    onChange: (markdown: string) => void;
    readOnly?: boolean;
    showPdfUpload?: boolean;
}

const converter = new showdown.Converter({ tables: true, extensions: [] });

const INLINE_STYLE = "background:#fff59d;"; // amarelo (simples)
const DOUBLE_STYLE = "background:#cfe8ff;"; // azul (if)
const TRIPLE_STYLE = "background:#f8c8e6;"; // rosa (outer-if)

/**
 * Componente Editor com botão na toolbar para "Copiar c/ highlights".
 * - tenta RTF/HTML no clipboard (Word); se não for permitido, usa execCommand fallback.
 * - highlights: {{{...}}} (rosa), {{...}} (azul), {...} (amarelo)
 */
const Editor: FC<EditorProps> = ({ markdown, editorRef, onChange, readOnly, showPdfUpload = false }) => {
    const [currentMarkdown, setCurrentMarkdown] = React.useState(markdown);
    const [isProcessingPdf, setIsProcessingPdf] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);
    const [pdfError, setPdfError] = React.useState<string | null>(null);
    const [reloadCounter, setReloadCounter] = React.useState(0);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Sincronizar quando markdown prop mudar externamente (ex: upload de PDF)
    React.useEffect(() => {
        setCurrentMarkdown(markdown);
    }, [markdown]);

    const handleChange = (newMarkdown: string) => {
        onChange(newMarkdown);
        setCurrentMarkdown(newMarkdown);
    };

    const processPdfFile = async (file: File) => {
        setPdfError(null);

        if (file.type !== 'application/pdf') {
            setPdfError('Por favor, selecione apenas arquivos PDF.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB
            setPdfError('O arquivo PDF é muito grande. Tamanho máximo: 10MB.');
            return;
        }

        setIsProcessingPdf(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/v1/pdf/extract', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                setPdfError(errorData.error || 'Erro ao processar o PDF.');
                return;
            }

            const { text } = await response.json();

            // Remover tags <page> e </page> que causam erro no editor markdown
            const cleanText = text
                .replace(/<page number="\d+">\n?/g, '')
                .replace(/<\/page>\n?/g, '\n')
                .trim();

            onChange(cleanText);
            setCurrentMarkdown(cleanText);
            setReloadCounter((c) => c + 1); // forçar reload do editor
        } catch (error) {
            console.error('Erro ao processar PDF:', error);
            setPdfError('Erro ao processar o PDF. Verifique sua conexão e tente novamente.');
        } finally {
            setIsProcessingPdf(false);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processPdfFile(file);
        }
    };

    const handleDragOver = (event: React.DragEvent) => {
        if (!showPdfUpload) return;
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (event: React.DragEvent) => {
        if (!showPdfUpload) return;
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (event: React.DragEvent) => {
        if (!showPdfUpload) return;
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);

        const file = event.dataTransfer.files?.[0];
        if (file) {
            processPdfFile(file);
        }
    };

    async function getEditorContentHtmlOrText(): Promise<{ html: string; text: string }> {
        // aqui você converte o markdown atual para HTML (usando showdown como antes)
        const html = converter.makeHtml(currentMarkdown || "");
        return { html, text: currentMarkdown || "" };
    }

    function escapeHtml(str: string) {
        return str
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    /**
     * Reaproveita a função de highlight que você já aprovou:
     * transforma HTML gerado em HTML com spans inline (mantendo chaves).
     */
    function applyBracesHighlightToHtml(html: string) {
        const container = document.createElement("div");
        container.innerHTML = html;

        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
        const textNodes: Text[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) {
            const parentEl = (node.parentElement ?? (node.parentNode as HTMLElement)) as HTMLElement | null;
            if (!parentEl) continue;
            if (parentEl.closest("code, pre")) continue;
            if (parentEl.closest("[data-braces]")) continue;
            textNodes.push(node as Text);
        }

        // Regex combinada: primeiro grupo = triple, segundo = double, terceiro = single
        // Captura conteúdo (pode ser vazio, por exemplo {{{}}} ou {{}})
        const re = /\{\{\{\s*([^}]*)\s*\}\}\}|\{\{\s*([^}]*)\s*\}\}|\{\s*([^}]+?)\s*\}/g;

        for (const tnode of textNodes) {
            const text = tnode.nodeValue ?? "";
            if (!text.includes("{")) continue;
            const frag = document.createDocumentFragment();
            let lastIndex = 0;
            re.lastIndex = 0;
            let m: RegExpExecArray | null;
            let changed = false;
            while ((m = re.exec(text))) {
                const full = m[0];
                const start = m.index;

                // partes antes do match
                if (start > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, start)));

                // determinar tipo pelo grupo preenchida
                const tripleInner = m[1];
                const doubleInner = m[2];
                const singleInner = m[3];

                let span = document.createElement("span");
                span.setAttribute("data-braces", "1");

                if (typeof tripleInner !== "undefined") {
                    // triple (outer-if) — mantém as chaves
                    span.setAttribute("style", TRIPLE_STYLE);
                    span.textContent = `{{{${tripleInner}}}}`;
                } else if (typeof doubleInner !== "undefined") {
                    // double (if) — mantém as chaves
                    span.setAttribute("style", DOUBLE_STYLE);
                    span.textContent = `{{${doubleInner}}}`;
                } else if (typeof singleInner !== "undefined") {
                    // single — mantém as chaves
                    span.setAttribute("style", INLINE_STYLE);
                    span.textContent = `{${singleInner}}`;
                } else {
                    // fallback (não deve acontecer)
                    span.setAttribute("style", INLINE_STYLE);
                    span.textContent = full;
                }

                frag.appendChild(span);

                lastIndex = start + full.length;
                changed = true;
            }
            if (changed) {
                if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)));
                tnode.parentNode?.replaceChild(frag, tnode);
            }
        }

        return container.innerHTML;
    }

    async function copyWithHighlights() {
        const content = await getEditorContentHtmlOrText();
        let htmlToCopy: string;
        let textToCopy: string;

        htmlToCopy = applyBracesHighlightToHtml(content.html);
        textToCopy = content.text;

        if (navigator.clipboard && (window as any).ClipboardItem) {
            const blobHtml = new Blob([htmlToCopy], { type: "text/html" });
            const blobText = new Blob([textToCopy], { type: "text/plain" });
            // @ts-ignore
            const item = new ClipboardItem({
                "text/html": blobHtml,
                "text/plain": blobText,
            });
            await navigator.clipboard.write([item]);
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
            // fallback para texto simples (sem estilo)
            await navigator.clipboard.writeText(textToCopy);
        }
    }

    // --- Toolbar button component (simple) ---
    const ToolbarCopyButton: React.FC = () => {
        const onClick = async (ev: React.MouseEvent) => {
            ev.preventDefault();
            ev.stopPropagation();
            try {
                await copyWithHighlights();
            } catch (err) {
                console.error("copyWithHighlights failed", err);
            }
        };

        return (
            <button
                onClick={onClick}
                title="Copiar com highlights"
                aria-label="Copiar para Wordcom highlights"
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    borderRadius: 6,
                    background: "white",
                    border: "0px solid #e5e7eb",
                    cursor: "pointer",
                    // fontSize: 13,
                }}
            >
                <FontAwesomeIcon icon={faCopy} />
            </button>
        );
    };

    const ToolbarPdfButton: React.FC = () => {
        const onClick = (ev: React.MouseEvent) => {
            ev.preventDefault();
            ev.stopPropagation();
            fileInputRef.current?.click();
        };

        return (
            <button
                onClick={onClick}
                title="Carregar PDF"
                aria-label="Carregar arquivo PDF"
                disabled={isProcessingPdf}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    borderRadius: 6,
                    background: "white",
                    border: "0px solid #e5e7eb",
                    cursor: isProcessingPdf ? "not-allowed" : "pointer",
                    opacity: isProcessingPdf ? 0.5 : 1,
                }}
            >
                <FontAwesomeIcon icon={faFilePdf} />
            </button>
        );
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ position: 'relative' }}
        >
            {showPdfUpload && isDragging && (
                <div
                    className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 border border-primary border-3 rounded"
                    style={{ zIndex: 10, pointerEvents: 'none' }}
                >
                    <div className="text-primary fs-4 fw-bold">
                        Solte o PDF aqui
                    </div>
                </div>
            )}
            {showPdfUpload && (
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
            )}
            <MDXEditor
                key={reloadCounter}
                className="mdx-editor p-0"
                onChange={(e) => handleChange(e)}
                ref={editorRef}
                markdown={markdown}
                readOnly={readOnly}
                plugins={[
                    headingsPlugin(),
                    listsPlugin(),
                    quotePlugin(),
                    thematicBreakPlugin(),
                    markdownShortcutPlugin(),
                    diffSourcePlugin({
                        diffMarkdown: "An older version",
                        viewMode: "rich-text",
                        readOnlyDiff: true,
                    }),
                    toolbarPlugin({
                        toolbarContents: () => (
                            <>
                                <span style={{ width: 12 }} />
                                <DiffSourceToggleWrapper options={["rich-text", "source"]}>
                                    <BlockTypeSelect />
                                    <BoldItalicUnderlineToggles />
                                    {showPdfUpload && <ToolbarPdfButton />}
                                    <ToolbarCopyButton />
                                </DiffSourceToggleWrapper>
                            </>
                        ),
                    }),
                    codeMirrorPlugin({
                        codeBlockLanguages: { "": "text", "Markdown": "markdown" }
                    }),
                ]}
            />
            {showPdfUpload && isProcessingPdf && (
                <div className="position-absolute top-0 end-0 m-2" style={{ zIndex: 1000 }}>
                    <div className="d-flex align-items-center bg-white border rounded px-3 py-2 shadow-sm">
                        <Spinner animation="border" size="sm" className="me-2" />
                        <small>Processando PDF...</small>
                    </div>
                </div>
            )}
            {showPdfUpload && (
                <ToastContainer className="p-3" position="top-end" style={{ zIndex: 1050 }}>
                    <Toast
                        onClose={() => setPdfError(null)}
                        show={!!pdfError}
                        delay={8000}
                        bg="danger"
                        autohide
                    >
                        <Toast.Header>
                            <strong className="me-auto">Erro ao processar PDF</strong>
                        </Toast.Header>
                        <Toast.Body className="text-white">
                            {pdfError}
                        </Toast.Body>
                    </Toast>
                </ToastContainer>
            )}
        </div>
    );
};

export default Editor;
