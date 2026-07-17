import 'server-only'

import { PrefsCookieType } from '@/lib/utils/prefs-types';
import { headers, cookies } from 'next/headers';
import { PrefsDao } from '@/lib/db/dao';
import { ADM_MODE_PREFIX, applyModeToUrl } from './mode-url';

// Somente leitura. A migração cookie->banco (e a remoção do cookie) é feita pela
// server action migratePrefsFromCookie(), disparada no mount do PrefsMigrator:
// cookies não podem ser mutados durante o render de um Server Component.
export async function getPrefs(): Promise<PrefsCookieType | undefined> {

    // 1) Header "prefs" injetado pelo proxy de infra (prioridade máxima: permite
    //    forçar modelo/chave de tribunal independentemente do banco/cookie).
    const headersList = await (headers());
    const prefsHeader = headersList.get("prefs")
    if (prefsHeader) {
        const s = atob(prefsHeader)
        const json = JSON.parse(s)
        const model = json.model
        const env = json.env
        return { model, env }
    }

    // 2) Banco: preferências do usuário autenticado (fonte de verdade principal).
    const fromDb = await PrefsDao.getPrefsForCurrentUser()
    if (fromDb) return fromDb

    // 3) Cookie: fallback para sessões sem usuário ou sem DB (ex.: dev local),
    //    ou enquanto aguarda migração para o banco pelo PrefsMigrator.
    const cookiesList = await (cookies());
    const prefsCookie = cookiesList.get('prefs')?.value
    if (prefsCookie)
        return JSON.parse(atob(prefsCookie))

    return undefined
}

// Helpers para anonymize e beta-tester. Prioridade banco > cookie (legado),
// para que usuários ainda não migrados continuem funcionando até o PrefsMigrator rodar.

export async function getAnonymize(): Promise<boolean> {
    const fromDb = await PrefsDao.getAnonymize()
    if (fromDb !== undefined) return fromDb
    const cookiesList = await (cookies());
    return cookiesList.get('anonymize')?.value !== 'false'
}

export async function isBetaTester(): Promise<boolean> {
    const fromDb = await PrefsDao.getBetaTester()
    if (fromDb !== undefined) return fromDb
    const cookiesList = await (cookies());
    return cookiesList.get('beta-tester')?.value === '2'
}

// Modo de operação (Judicial / Administrativo). A URL é a fonte da verdade:
// o proxy.ts injeta o request header "x-apoia-mode" quando o path tem o
// prefixo "/adm" (e o remove das demais URLs). O banco não guarda mais a
// preferência de modo (coluna ia_user_prefs.mode removida na migration-029).
// Retorna string (não ModeKey) porque ModeKey = keyof typeof Mode inclui number
// (devido ao index signature de ModeType), o que não é útil para os callers.
export async function getMode(): Promise<string> {
    const headersList = await (headers());
    return headersList.get('x-apoia-mode') === 'ADMINISTRATIVO' ? 'ADMINISTRATIVO' : 'JUDICIAL'
}

// Ajusta uma URL ao modo corrente (regras em applyModeToUrl, lib/utils/mode-url.ts).
// Usar em redirects/hrefs de server components e actions sensíveis ao modo.
export async function modeUrl(url: string): Promise<string> {
    return applyModeToUrl(url, await getMode())
}

// Versão curried de modeUrl, para pontos que ajustam várias URLs de uma vez.
export async function getModeUrl(): Promise<(url: string) => string> {
    const modePrefix = (await getMode()) === 'ADMINISTRATIVO' ? ADM_MODE_PREFIX : ''
    return (url: string) => applyModeToUrl(url, modePrefix)
}

