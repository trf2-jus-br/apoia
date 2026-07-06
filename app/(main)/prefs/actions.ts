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

// Migração automática cookie -> banco. Disparada uma vez no mount do PrefsMigrator.
// Só age quando há usuário autenticado com DB. Cenários:
//  - Banco vazio + cookie presente: persiste o cookie no banco e remove o cookie.
//  - Banco já preenchido + cookie presente (outro browser): apenas remove o cookie
//    órfão (o banco é a fonte de verdade).
//  - Sem usuário/DB: no-op (mantém o cookie como fallback de dev local).
// Retorna true quando houve mudança (para o cliente poder router.refresh).
export async function migratePrefsFromCookie(): Promise<boolean> {
    const cookieStore = await cookies()
    const cookieValue = cookieStore.get('prefs')?.value
    if (!cookieValue) return false // nada a migrar

    let prefsFromCookie: PrefsCookieType | undefined
    try {
        prefsFromCookie = JSON.parse(atob(cookieValue))
    } catch {
        // cookie inválido/corrompido: remove e encerra
        await removeGenericCookie('prefs')
        return true
    }

    const fromDb = await PrefsDao.getPrefsForCurrentUser()
    if (fromDb) {
        // Banco já tem prefs (usuário acessando de outro browser): o cookie é órfão.
        // Despreza e apaga o cookie para convergir para a fonte de verdade única.
        await removeGenericCookie('prefs')
        return true
    }

    const savedToDb = await PrefsDao.upsertPrefsForCurrentUser(prefsFromCookie)
    if (savedToDb) {
        // Migrou com sucesso: remove o cookie (banco agora é a fonte de verdade).
        await removeGenericCookie('prefs')
        return true
    }

    // Sem usuário/DB: nada a fazer (cookie segue como fallback).
    return false
}
