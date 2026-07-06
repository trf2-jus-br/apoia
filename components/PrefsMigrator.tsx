'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { migratePrefsFromCookie } from '@/app/(main)/prefs/actions'

// Migra automaticamente as preferências (modelo + chaves de API) do cookie legacy
// para o banco, uma única vez por sessão de navegador. Renderizado no layout global
// para cobrir todas as rotas.
//
// No Server Component não é possível mutar cookies durante o render, então a
// migração acontece via server action disparada no mount deste Client Component.
export default function PrefsMigrator() {
    const router = useRouter()

    useEffect(() => {
        let cancelled = false
        migratePrefsFromCookie()
            .then((changed) => {
                if (!cancelled && changed) {
                    // O cookie foi removido e/ou o banco foi populado: atualiza a UI
                    // para refletir a nova fonte de verdade (banco).
                    router.refresh()
                }
            })
            .catch(() => {
                // Falha na migração é não-fatal: o cookie segue como fallback.
            })
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return null
}
