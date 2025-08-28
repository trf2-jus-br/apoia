"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VisualizationEnum, Visualization } from '@/lib/ui/preprocess';

// Helper to map enum to label, omitting 'Destacar Inclusões'
const visualizationOptions = Visualization
  .filter(v => v.id !== VisualizationEnum.DIFF_HIGHLIGHT_INCLUSIONS)
  .map(v => ({ value: v.id as VisualizationEnum, label: v.descr }));

type Mode = 'window' | 'iframe' | 'modal';

const defaultOld = `# Documento Original\n\nTexto inicial para testes.\n\n- Item A\n- Item B`;
const defaultNew = `# Documento Revisado\n\nTexto inicial para testes com **alterações**.\n\n- Item A\n- Item B modificado\n- Item C (novo)`;

const TestDiffPage: React.FC = () => {
  const [oldText, setOldText] = useState(defaultOld);
  const [newText, setNewText] = useState(defaultNew);
  const [mode, setMode] = useState<Mode>('window');
  const [selectedVis, setSelectedVis] = useState<VisualizationEnum[]>([
    VisualizationEnum.DIFF,
    VisualizationEnum.DIFF_COMPACT,
    VisualizationEnum.TEXT_EDITED,
    VisualizationEnum.TEXT_ORIGINAL,
  ]);
  const [logs, setLogs] = useState<string[]>([]);
  const iframeContainerRef = useRef<HTMLDivElement | null>(null);
  const lastApiRef = useRef<any>(null);

  const toggleVis = useCallback((v: VisualizationEnum) => {
    setSelectedVis(list => list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
  }, []);

  const orderedSelectedVis = useMemo(() => {
    // maintain order as in visualizationOptions
    return visualizationOptions.filter(o => selectedVis.includes(o.value)).map(o => o.value);
  }, [selectedVis]);

  const log = useCallback((m: string) => setLogs(l => [new Date().toLocaleTimeString() + ' ' + m, ...l].slice(0,200)), []);

  // Ensure diff.js loaded (in dev may not be cached yet)
  useEffect(() => {
    if ((window as any).ApoiaDiff) return; // already loaded
    const script = document.createElement('script');
    script.src = '/diff.js';
    script.async = true;
    script.onload = () => log('diff.js carregado');
    script.onerror = () => log('Falha ao carregar diff.js');
    document.head.appendChild(script);
  }, [log]);

  const startDiff = useCallback(() => {
    if (!(window as any).ApoiaDiff) {
      log('ApoiaDiff indisponível');
      return;
    }
    if (orderedSelectedVis.length === 0) {
      log('Selecione ao menos uma visualização');
      return;
    }
    try {
      const api = (window as any).ApoiaDiff.start({
        oldMarkdown: oldText,
        newMarkdown: newText,
        visualizations: orderedSelectedVis,
        mode,
        container: mode === 'iframe' ? iframeContainerRef.current : undefined,
        onApproved: (md: string) => log('Aprovado (tamanho=' + md.length + ')'),
        onCancel: () => log('Cancelado'),
      });
      lastApiRef.current = api;
      log('Diff iniciado (cid=' + api.correlationId + ')');
    } catch (e: any) {
      log('Erro: ' + e.message);
    }
  }, [oldText, newText, orderedSelectedVis, mode, log]);

  const closeSession = useCallback(() => {
    if (lastApiRef.current) {
      try { lastApiRef.current.close(); log('Sessão fechada manualmente'); } catch(e:any) { log('Erro ao fechar: ' + e.message); }
    }
  }, [log]);

  return (
  <div className="container p-3" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <h4 className="mb-3">Teste de Diff Embutido</h4>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label fw-semibold">Markdown Original</label>
          <textarea className="form-control" rows={14} value={oldText} onChange={e => setOldText(e.target.value)} />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Markdown Novo</label>
            <textarea className="form-control" rows={14} value={newText} onChange={e => setNewText(e.target.value)} />
        </div>
      </div>

      <hr className="my-4" />
      <div className="row g-3">
        <div className="col-md-3">
          <label className="form-label fw-semibold">Modo</label>
          <select className="form-select" value={mode} onChange={e => setMode(e.target.value as Mode)}>
            <option value="window">Window (_blank)</option>
            <option value="iframe">Iframe</option>
            <option value="modal">Modal</option>
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Visualizações (clique para (des)selecionar)</label>
          <div>
            {visualizationOptions.map(o => (
              <button key={o.value}
                type="button"
                onClick={() => toggleVis(o.value)}
                className={`btn me-2 mb-2 ${selectedVis.includes(o.value) ? 'btn-primary' : 'btn-outline-primary'}`}>{o.label}</button>
            ))}
          </div>
          {/** Ordem atual omitida conforme solicitado */}
        </div>
        <div className="col-md-3 d-flex align-items-end justify-content-end">
          <div className="d-flex gap-2 ms-auto">
            <button className="btn btn-success mb-2" onClick={startDiff}>Diff</button>
            <button className="btn btn-outline-secondary mb-2" onClick={closeSession}>Fechar</button>
          </div>
        </div>
      </div>

      {mode === 'iframe' && (
        <div className="mt-4 border rounded" style={{ minHeight: '620px', background: '#fafafa' }} ref={iframeContainerRef} />
      )}

      <div className="mt-4">
        <h6>Logs</h6>
        <ul className="list-unstyled small" style={{ maxHeight: '200px', overflow: 'auto' }}>
          {logs.map((l,i) => <li key={i}>{l}</li>)}
        </ul>
      </div>
    </div>
  );
};

export default TestDiffPage;
