import 'server-only'

import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'
import { SANITIZE_CONFIG } from '../ui/sanitize-html'

// JSDOM é caro de criar: um único window por processo atende todas as requests.
const purify = DOMPurify(new JSDOM('').window as any)

// Sanitiza HTML em código server-side (rotas de API que montam documentos/fragmentos).
// Equivalente server-side do sanitizeHtml de lib/ui/sanitize-html (mesma config).
export function sanitizeHtmlServer(html: string): string {
    if (!html) return html
    return purify.sanitize(html, SANITIZE_CONFIG)
}
