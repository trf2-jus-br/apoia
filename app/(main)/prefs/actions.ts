'use server'

import { cookies } from 'next/headers'
import { PrefsCookieType } from '@/lib/utils/prefs-types';
import { PrefsDao } from '@/lib/db/dao';
import { addGenericCookie, removeGenericCookie } from '../prompts/add-cookie';

// Persiste as preferências no banco (usuário autenticado com DB) ou, na ausência
// de usuário/DB, faz fallback para o cookie (compatibilidade com dev local).
export async function savePrefs(prefs: PrefsCookieType): Promise<void> {
    const savedToDb = await PrefsDao.upsertPrefsForCurrentUser(prefs)
    if (savedToDb) {
        // Banco passou a ser fonte de verdade: remove o cookie para evitar divergência.
        await removeGenericCookie('prefs')
    } else {
        // Sem usuário/DB: mantém o comportamento legado via cookie.
        await addGenericCookie('prefs', btoa(JSON.stringify(prefs)))
    }
}

// Limpa as preferências no banco (se houver) e remove o cookie legacy.
export async function clearPrefs(): Promise<void> {
    await PrefsDao.clearPrefsForCurrentUser()
    await removeGenericCookie('prefs')
}

// ---- Anonymize ----
// Só banco. Sem usuário/DB → no-op (toggle funciona na sessão atual via state do React).
export async function setAnonymize(value: boolean): Promise<void> {
    await PrefsDao.setAnonymize(value)
}

// ---- Beta tester ----
// Só banco.
export async function setBetaTester(value: boolean): Promise<void> {
    await PrefsDao.setBetaTester(value)
}

// Migração automática cookie -> banco. Disparada uma vez no mount do PrefsMigrator.
// Migra independentemente os três cookies: prefs (model + env), anonymize e beta-tester.
// Cada um só é migrado quando há usuário autenticado com DB; caso contrário segue como
// fallback de dev local. Retorna true quando houve qualquer mudança (router.refresh).
export async function migratePrefsFromCookie(): Promise<boolean> {
    const cookieStore = await cookies()
    let changed = false

    // ---- prefs (model + env) ----
    const prefsCookieValue = cookieStore.get('prefs')?.value
    if (prefsCookieValue) {
        let prefsFromCookie: PrefsCookieType | undefined
        try {
            prefsFromCookie = JSON.parse(atob(prefsCookieValue))
        } catch {
            // cookie inválido/corrompido: remove e segue
            await removeGenericCookie('prefs')
            changed = true
            prefsFromCookie = undefined
        }

        if (prefsFromCookie) {
            const fromDb = await PrefsDao.getPrefsForCurrentUser()
            if (fromDb) {
                // Banco já tem prefs (outro browser): cookie órfão -> descarta.
                await removeGenericCookie('prefs')
                changed = true
            } else {
                const savedToDb = await PrefsDao.upsertPrefsForCurrentUser(prefsFromCookie)
                if (savedToDb) {
                    await removeGenericCookie('prefs')
                    changed = true
                }
            }
        }
    }

    // ---- anonymize ----
    // Cookie valores: 'true' | 'false'. Default (ausente) = anonimizar = true.
    // Migra respeitando a semântica de 24h: se o cookie já expirou (não dá para saber
    // via server action, pois o maxAge do client-cookie já o removeu do cookieStore),
    // não haverá cookie aqui -> nada a migrar. Se há cookie 'false' (opt-out ativo),
    // grava opt-out com until=agora+24h.
    const anonymizeCookieValue = cookieStore.get('anonymize')?.value
    if (anonymizeCookieValue !== undefined) {
        const value = anonymizeCookieValue !== 'false' // true = anonimizar
        // Só migra se houver usuário/DB (PrefsDao é no-op caso contrário).
        await PrefsDao.setAnonymize(value)
        // Remove o cookie: a fonte de verdade passa a ser o banco.
        // (client-set, não httpOnly -> pode ser removido via cookies().delete())
        try { cookieStore.delete('anonymize'); changed = true } catch { /* no-op */ }
    }

    // ---- beta-tester ----
    // Cookie valor: '2' (legado, mágico). Migra para beta_tester=true.
    const betaCookieValue = cookieStore.get('beta-tester')?.value
    if (betaCookieValue === '2') {
        await PrefsDao.setBetaTester(true)
        try { cookieStore.delete('beta-tester'); changed = true } catch { /* no-op */ }
    }

    return changed
}
