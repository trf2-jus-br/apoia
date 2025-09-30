// /c:/Repositories/apoia/lib/utils/log.ts
// Função que age como console.log mas só imprime em ambiente de desenvolvimento.

export function devLog(...args: unknown[]): void {
    const isDev = (() => {
        // Node.js
        if (typeof process !== 'undefined' && typeof process.env !== 'undefined') {
            return process.env.NODE_ENV === 'development';
        }

        // Browsers / runtimes that expose globals
        if (typeof globalThis !== 'undefined') {
            const g = globalThis as any;
            // common patterns (__DEV__ usado por React Native / bundlers)
            if (typeof g.__DEV__ !== 'undefined') return Boolean(g.__DEV__);
            if (typeof g.NODE_ENV !== 'undefined') return g.NODE_ENV === 'development';
            // Vite / some bundlers expose import.meta.env at build time; check defensively
            try {
                if (typeof (g as any).importMeta !== 'undefined' && (g as any).importMeta.env) {
                    return (g as any).importMeta.env.MODE === 'development' || (g as any).importMeta.env.VITE_MODE === 'development';
                }
            } catch {
                /* ignore */
            }
        }

        return false;
    })();

    if (!isDev) return;
    // mantém comportamento do console (formatting, %s, etc.)
    console.log(...args);
}

export default devLog;