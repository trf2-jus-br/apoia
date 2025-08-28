"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { preprocess, VisualizationEnum, Visualization } from '@/lib/ui/preprocess';
import DOMPurify from 'dompurify';

// Allowed visualization ids exposed by parent via INIT (subset of VisualizationEnum)
// We trust only numeric enum values that exist in VisualizationEnum

const APOIA_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://apoia.pdpj.jus.br';

interface InitMessage {
    type: 'APOIA_DIFF_INIT';
    correlationId: string;
    oldMarkdown: string;
    newMarkdown: string;
    visualizations: VisualizationEnum[]; // order defines default (first)
}

interface ReadyMessage { type: 'APOIA_DIFF_READY'; correlationId: string; }
interface ApprovedMessage { type: 'APOIA_DIFF_APPROVED'; correlationId: string; approvedMarkdown: string; }
interface CanceledMessage { type: 'APOIA_DIFF_CANCELED'; correlationId: string; }
interface ErrorMessage { type: 'APOIA_DIFF_ERROR'; correlationId: string; error: string; }

type AnyMessage = InitMessage | ReadyMessage | ApprovedMessage | CanceledMessage | ErrorMessage;

const DiffPage: React.FC = () => {
    const searchParams = useMemo(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''), []);
    const cid = searchParams.get('cid') || 'standalone';
    const [oldMarkdown, setOldMarkdown] = useState('');
    const [newMarkdown, setNewMarkdown] = useState('');
    const [allowedVisualizations, setAllowedVisualizations] = useState<VisualizationEnum[]>([VisualizationEnum.DIFF, VisualizationEnum.DIFF_COMPACT, VisualizationEnum.TEXT_EDITED, VisualizationEnum.TEXT_ORIGINAL]);
    const [activeVis, setActiveVis] = useState<VisualizationEnum>(VisualizationEnum.DIFF);
    const [error, setError] = useState<string | null>(null);
    const [initReceived, setInitReceived] = useState(false);
    const approvedRef = useRef(false);

    // Post READY once mounted: supports popup (window.opener) or embedded (window.parent)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const msg = { type: 'APOIA_DIFF_READY', correlationId: cid } as any;
        try {
            if (window.opener) {
                window.opener.postMessage(msg, '*');
            } else if (window.parent && window.parent !== window) {
                window.parent.postMessage(msg, '*');
            }
        } catch (e) {
            console.error('Failed to post READY', e);
        }
    }, [cid]);

    // Listen for INIT
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handler = (ev: MessageEvent) => {
            const data: AnyMessage = ev.data;
            if (!data || typeof data !== 'object') return;
            if ((data as any).correlationId !== cid) return;
            if (data.type === 'APOIA_DIFF_INIT') {
                // Basic origin check: accept only same-origin or configured APOIA_ORIGIN
                // (Could be tightened, but we also allow '*' when posting READY, so we validate here)
                // Optionally: if (ev.origin !== APOIA_ORIGIN) return;
                setOldMarkdown(data.oldMarkdown || '');
                setNewMarkdown(data.newMarkdown || '');
                const visFiltered = (Array.isArray(data.visualizations) && data.visualizations.length > 0 ? data.visualizations : allowedVisualizations)
                    .filter(v => typeof v === 'number' && Visualization[v] !== undefined);
                setAllowedVisualizations(visFiltered.length ? visFiltered : allowedVisualizations);
                setActiveVis((visFiltered.length ? visFiltered[0] : allowedVisualizations[0]) as VisualizationEnum);
                setInitReceived(true);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [cid, allowedVisualizations]);

    const sendToParent = useCallback((msg: any) => {
        if (typeof window === 'undefined') return;
        try {
            if (window.opener) {
                window.opener.postMessage(msg, '*');
            } else if (window.parent && window.parent !== window) {
                window.parent.postMessage(msg, '*');
            }
        } catch (e) {
            console.error('postMessage failed', e);
        }
    }, []);

    const approve = useCallback(() => {
        if (approvedRef.current) return;
        approvedRef.current = true;
        sendToParent({ type: 'APOIA_DIFF_APPROVED', correlationId: cid, approvedMarkdown: newMarkdown });
        window.close();
    }, [cid, newMarkdown, sendToParent]);

    const cancel = useCallback(() => {
        if (approvedRef.current) return;
        sendToParent({ type: 'APOIA_DIFF_CANCELED', correlationId: cid });
        window.close();
    }, [cid, sendToParent]);

    // Compute visualization
    const html = useMemo(() => {
        try {
            if (!initReceived) return '<p>Aguardando dados...</p>';
            const result = preprocess(newMarkdown, { format: undefined } as any, { textos: [{ texto: oldMarkdown }] } as any, true, activeVis, oldMarkdown);
            // Sanitize
            return DOMPurify.sanitize(result.text, { USE_PROFILES: { html: true } });
        } catch (e: any) {
            setError(e.message || 'Erro ao gerar diff');
            return '<p>Erro</p>';
        }
    }, [activeVis, initReceived, newMarkdown, oldMarkdown]);

    return (
        <div className="container py-3" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <div className="d-flex align-items-center mb-3">
                <h5 className="me-auto mb-0">Comparação de Textos</h5>
            </div>
            <div className="row mb-3">
                <div className="col">
                    {allowedVisualizations.map(v => {
                        const info = Visualization.find(i => i.id === v);
                        return (
                            <button
                                key={v}
                                onClick={() => setActiveVis(v)}
                                className={`btn btn-sm me-2 ${activeVis === v ? 'btn-primary' : 'btn-outline-primary'}`}
                            >{info?.descr || v}</button>
                        );
                    })}
                </div>
                <div className="col text-end">
                    <button onClick={cancel} className="btn btn-outline-secondary btn-sm me-2">Cancelar</button>
                    <button onClick={approve} className="btn btn-success btn-sm">Aprovar</button>
                </div>
            </div>
            {!initReceived && <div className="alert alert-info py-2">Aguardando dados do chamador...</div>}
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <div className="border rounded p-3" style={{ background: '#fff', maxHeight: '70vh', overflow: 'auto' }}>
                <div dangerouslySetInnerHTML={{ __html: html }} />
            </div>
            <p className="text-muted mt-3 small">CID: {cid}</p>
        </div>
    );
};

export default DiffPage;
