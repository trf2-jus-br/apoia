import DOMPurify from 'dompurify'

// Config compartilhada entre client (sanitizeHtml) e server (lib/utils/sanitize-html-server).
// O perfil html mantém o markup legítimo da aplicação — ins/del de diff com class/title,
// spans de citação e link de peça com data-*, tabelas com classes Bootstrap, entidades —
// e bloqueia por padrão script/iframe/object/embed, handlers on* e URIs javascript:.
// style e form são proibidos explicitamente: nenhum conteúdo dinâmico legítimo os usa.
export const SANITIZE_CONFIG = {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form'],
}

// Sanitiza HTML que será injetado via dangerouslySetInnerHTML em componentes client.
// Durante SSR (sem window) o HTML é retornado como está: os pontos de consumo só têm
// conteúdo dinâmico (streaming, buscas, cliques) após a hidratação, quando o sanitize
// efetivamente roda. Código server-side (rotas de API) deve usar sanitizeHtmlServer.
export function sanitizeHtml(html: string): string {
    if (!html || typeof window === 'undefined') return html
    return DOMPurify.sanitize(html, SANITIZE_CONFIG)
}

// Escape para interpolacao de valores dinamicos em template strings que viram HTML.
// Nao usar para markdown — para isso existe o pipeline preprocess + sanitizeHtml.
export function escapeHtml(value: string): string {
    if (!value) return value
    return value.replace(/[&<>"']/g, (c) => {
        switch (c) {
            case '&': return '&amp;'
            case '<': return '&lt;'
            case '>': return '&gt;'
            case '"': return '&quot;'
            case "'": return '&#39;'
        }
        return c
    })
}
