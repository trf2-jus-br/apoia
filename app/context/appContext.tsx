'use client'

import { createContext, useContext, ReactNode } from 'react'

// Contexto de aplicação (nível mais alto que o PromptContext).
// Expõe dados que NÃO dependem de prompt (flags de usuário, modo de operação,
// preferências) e que devem estar disponíveis em qualquer rota dentro do
// GlobalProviders (cobre os grupos de rotas (main), (sidekick) e (theme-dark)).
//
// O AppProvider é montado no GlobalProviders, com os valores resolvidos
// server-side no RootLayoutWithTheme. Dessa forma, componentes client como
// o AiContent podem ler isBetaTester/mode sem depender do PromptProvider
// (que só existe sob /prompts).
export interface AppContextValue {
    isBetaTester: boolean
    mode: string                 // 'JUDICIAL' | 'ADMINISTRATIVO'
    isAnonymized: boolean
    isModerator: boolean
    isCorporativo: boolean
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children, value }: { children: ReactNode; value: AppContextValue }) {
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

/** Strict: lança se usado fora de um AppProvider. */
export function useAppContext(): AppContextValue {
    const ctx = useContext(AppContext)
    if (ctx === undefined) {
        throw new Error('useAppContext must be used within an AppProvider')
    }
    return ctx
}

/** Safe: retorna null se não houver AppProvider (útil em componentes que rodam dentro e fora da árvore, ex.: AiContent). */
export function useAppContextSafe(): AppContextValue | null {
    return useContext(AppContext) ?? null
}
