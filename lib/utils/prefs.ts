import { PrefsCookieType } from '@/lib/utils/prefs-types';
import { headers, cookies } from 'next/headers';
import { PrefsDao } from '@/lib/db/dao';

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
    if (fromDb) {
        // Cookie órfão: o usuário acessa de outro browser onde ainda existe o cookie
        // antigo, mas já há registro no banco. O banco é a fonte de verdade, então
        // desprezamos e apagamos o cookie para evitar divergência.
        // Observação: cookies().delete() só pode ser chamado na fase de request; em
        // Server Components isso é permitido, mas envolvemos em try/catch para não
        // quebrar o render caso a mutação seja bloqueada (ex.: após streaming iniciar).
        try {
            const cookiesList = await (cookies());
            if (cookiesList.get('prefs')?.value) {
                cookiesList.delete('prefs')
            }
        } catch (e) {
            // mutação indisponível neste contexto; segue com o valor do banco
        }
        return fromDb
    }

    // 3) Cookie: fallback para sessões sem usuário ou sem DB (ex.: dev local).
    const cookiesList = await (cookies());
    const prefsCookie = cookiesList.get('prefs')?.value
    if (prefsCookie)
        return JSON.parse(atob(prefsCookie))

    return undefined
}
