'use server'

import { setBetaTester } from '@/app/(main)/prefs/actions'

// Ativa o status de beta tester para o usuário corrente (persistido no banco em
// ia_user_prefs). A rota /beta-tester continua funcionando; apenas a action
// subjacente agora escreve no banco em vez de um cookie.
export async function addBetaTesterCookie() {
    await setBetaTester(true)
    return null
}
