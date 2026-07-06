'use server'

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
