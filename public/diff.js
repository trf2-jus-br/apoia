(function(global) {
    const DEFAULT_VISUALIZATIONS = [0, 1, 3, 4]; // DIFF, DIFF_COMPACT, TEXT_EDITED, TEXT_ORIGINAL (matching VisualizationEnum order)
    const WINDOW_MODES = ['window', 'iframe', 'modal'];

    function uuidv4() {
        if (global.crypto && crypto.randomUUID) return crypto.randomUUID();
        // fallback
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function inferOrigin() {
        // 1. Allow explicit global override
        if (global.APOIA_DIFF_ORIGIN && typeof global.APOIA_DIFF_ORIGIN === 'string') {
            return global.APOIA_DIFF_ORIGIN.replace(/\/$/, '');
        }
        try {
            // 2. Prefer currentScript if it looks like diff.js
            const current = document.currentScript;
            if (current && current.src && /\/diff(\.min)?\.js(\?|#|$)/.test(current.src)) {
                const u = new URL(current.src, window.location.href);
                return u.origin;
            }
            // 3. Search all scripts for one whose src ends with diff.js
            const scripts = document.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
                const s = scripts[i];
                if (s.src && /\/diff(\.min)?\.js(\?|#|$)/.test(s.src)) {
                    const u = new URL(s.src, window.location.href);
                    return u.origin;
                }
            }
        } catch (e) { /* ignore */ }
        // 4. Fallback to page origin
        return window.location.origin;
    }

    function buildUrl(origin, cid) {
        return origin.replace(/\/$/, '') + '/diff?cid=' + encodeURIComponent(cid);
    }

    function createIframe(url) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = '0';
        iframe.allowFullscreen = true;
        return iframe;
    }

    function createModalWrapper(url) {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0,0,0,0.4)';
        overlay.style.zIndex = '999999';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';

        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.margin = '2rem auto';
        container.style.background = '#fff';
        container.style.width = 'min(1200px, 95vw)';
        container.style.height = '80vh';
        container.style.boxShadow = '0 4px 24px rgba(0,0,0,0.2)';
        container.style.borderRadius = '6px';
        container.style.overflow = 'hidden';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.setAttribute('type', 'button');
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '4px';
        closeBtn.style.right = '8px';
        closeBtn.style.border = 'none';
        closeBtn.style.background = 'transparent';
        closeBtn.style.fontSize = '24px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });

        const iframe = createIframe(url);
        container.appendChild(iframe);
        container.appendChild(closeBtn);
        overlay.appendChild(container);
        return { overlay, iframe };
    }

    function start(opts) {
        const {
            oldMarkdown,
            newMarkdown,
            visualizations = DEFAULT_VISUALIZATIONS,
            mode = 'window',
            target = '_blank',
            origin = inferOrigin(),
            container,
            onApproved,
            onCancel,
            timeoutMs = 15000
        } = opts || {};

        if (!oldMarkdown && oldMarkdown !== '') throw new Error('oldMarkdown requerido (pode ser string vazia)');
        if (typeof newMarkdown !== 'string') throw new Error('newMarkdown requerido');

        if (!Array.isArray(visualizations) || visualizations.length === 0) {
            throw new Error('visualizations deve ser array não vazio de enums numéricos');
        }

        if (!WINDOW_MODES.includes(mode)) throw new Error('mode inválido');

        const correlationId = uuidv4();
        const url = buildUrl(origin, correlationId);

        let childWindow = null;
        let iframe = null;
        let cleanupModal = null;

        if (mode === 'window') {
            // Importante: não usar 'noopener' pois precisamos de window.opener para o handshake READY -> INIT
            // (Se segurança adicional for necessária no futuro, migrar para BroadcastChannel ou MessageChannel dedicado.)
            childWindow = window.open(url, target);
            if (!childWindow) throw new Error('Falha ao abrir janela (popup bloqueado?)');
        } else if (mode === 'iframe') {
            const parent = container || document.body;
            iframe = createIframe(url);
            iframe.style.height = '600px';
            parent.appendChild(iframe);
            childWindow = iframe.contentWindow;
        } else if (mode === 'modal') {
            const { overlay, iframe: ifr } = createModalWrapper(url);
            document.body.appendChild(overlay);
            iframe = ifr;
            childWindow = iframe.contentWindow;
            cleanupModal = () => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };
        }

        let finalized = false;
        let ready = false;

        function finalize() {
            if (finalized) return;
            finalized = true;
            window.removeEventListener('message', onMessage);
            clearTimeout(timer);
        }

        function onMessage(ev) {
            if (!ev || !ev.data) return;
            const data = ev.data;
            if (data.correlationId !== correlationId) return;
            switch (data.type) {
                case 'APOIA_DIFF_READY':
                    if (ready) return; // avoid duplicates
                    ready = true;
                    // send INIT
                    childWindow.postMessage({
                        type: 'APOIA_DIFF_INIT',
                        correlationId,
                        oldMarkdown,
                        newMarkdown,
                        visualizations
                    }, '*');
                    break;
                case 'APOIA_DIFF_APPROVED':
                    finalize();
                    if (typeof onApproved === 'function') {
                        try { onApproved(data.approvedMarkdown); } catch (e) { console.error(e); }
                    }
                    if (mode === 'modal' && cleanupModal) cleanupModal();
                    else if (mode === 'iframe') { /* keep iframe unless caller removes */ }
                    break;
                case 'APOIA_DIFF_CANCELED':
                    finalize();
                    if (typeof onCancel === 'function') {
                        try { onCancel(); } catch (e) { console.error(e); }
                    }
                    if (mode === 'modal' && cleanupModal) cleanupModal();
                    break;
                case 'APOIA_DIFF_ERROR':
                    finalize();
                    console.error('Erro recebido do diff:', data.error);
                    if (typeof onCancel === 'function') onCancel();
                    if (mode === 'modal' && cleanupModal) cleanupModal();
                    break;
            }
        }

        window.addEventListener('message', onMessage);

        const timer = setTimeout(() => {
            if (!ready) {
                finalize();
                console.error('Timeout aguardando READY do diff');
                if (typeof onCancel === 'function') onCancel();
                if (mode === 'modal' && cleanupModal) cleanupModal();
            }
        }, timeoutMs);

        const api = {
            correlationId,
            close: () => {
                if (finalized) return;
                if (mode === 'window' && childWindow && !childWindow.closed) childWindow.close();
                if (mode === 'modal' && cleanupModal) cleanupModal();
                finalize();
            }
        };
        return api;
    }

    global.ApoiaDiff = { start };
})(window);