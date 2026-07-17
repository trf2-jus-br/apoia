import 'server-only'

import authOptions from '../app/api/auth/[...nextauth]/options'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { headers } from "next/headers"
import { verifyJweToken, verifyJwkSignedToken } from './utils/jwt'
import { envString } from './utils/env'
import { UnauthorizedError } from './utils/api-error'
import { slugify } from './utils/utils'
import devLog from './utils/log'
import { mcpRequestContext } from './mcp/mcp-request-context'
import { modeUrl } from './utils/prefs'

export type UserType = {
    id?: number, name: string, email: string, preferredUsername?: string, iss?: string, encryptedPassword: string, system: string, accessToken?: string, corporativo?: any[], roles?: string[]
}

// Resolve um token PDPJ (JWT cru, sem o prefixo "Bearer PDPJ") em um UserType.
// Extraído de getCurrentUser() para permitir reuso em outros contextos (ex.: rota MCP),
// onde a autenticação não vem do header "Authorization: Bearer PDPJ" padrão.
export const getUserFromPdpjToken = async (rawJwt: string): Promise<UserType | undefined> => {
    try {
        const claims: any = await verifyJwkSignedToken(rawJwt, envString('PDPJ_JWK'))

        // Aggregate roles from realm_access and resource_access
        const roleSet = new Set<string>()
        if (claims?.realm_access?.roles) (claims.realm_access.roles as string[]).forEach(r => roleSet.add(r))
        if (claims?.resource_access) {
            Object.values(claims.resource_access as Record<string, any>).forEach((svc: any) => {
                (svc?.roles as string[] | undefined)?.forEach(r => roleSet.add(r))
            })
        }
        const roles = Array.from(roleSet)

        return {
            name: claims.name,
            email: claims.email,
            preferredUsername: claims.preferred_username,
            iss: claims.iss,
            accessToken: rawJwt,
            corporativo: claims.corporativo,
            roles,
            encryptedPassword: undefined,
            system: undefined,
        }
    } catch (error) {
        console.error('Invalid pdpj-authorization token:', error)
        return undefined
    }
}

export const getCurrentUser = async (): Promise<UserType | undefined> => {
    // Fluxo MCP: quando uma request MCP está em curso, o usuário já foi resolvido pelo
    // verifyToken da rota (via McpTokenDao) e guardado no AsyncLocalStorage (mcpRequestContext).
    // Retornamos ele aqui para que códigos server-side genéricos (ex.: interop.init(), DAOs que
    // usam assertCurrentUser) funcionem no contexto MCP sem alteração. Fora do fluxo MCP o ALS
    // está vazio (getStore() retorna undefined) e o comportamento é o original.
    const mcpUser = mcpRequestContext.getStore()
    if (mcpUser) return mcpUser

    const headersList = await headers()

    const authorization = headersList.get("authorization")
    if (authorization?.startsWith('Bearer PDPJ ')) {
        const pdpjAuthorization = authorization.replace('Bearer PDPJ ', '')
        return getUserFromPdpjToken(pdpjAuthorization)
    }

    if (authorization) {
        const claims: any = await verifyJweToken(authorization)
        return { name: claims.name, email: claims.name, encryptedPassword: claims.password, system: claims.system }
    }

    const session = await getServerSession(authOptions)
    if (!session) {
        return undefined
    }
    const user = session.user
    return user
}

export const assertCurrentUser = async () => {
    const user = await getCurrentUser()
    if (!user) redirect(await modeUrl('/auth/signin'))
    return user
}

export const assertSystemCode = async (user: UserType) => {
    const systemCode = user?.system || 'PDPJ'
    if (!systemCode) throw new Error('System code not found')
    return systemCode
}

export const isUserStaging = async (user: UserType) => {
    return user.iss === 'https://sso.stg.cloud.pje.jus.br/auth/realms/pje'
}

export const isUserCorporativo = async (user: UserType) => {
    return !!user.corporativo || !!user.system || process.env.NODE_ENV === 'development' || isUserStaging(user)
}

export const isUserModerator = async (user: UserType): Promise<boolean> => {
    return envString('MODERATOR') && user.preferredUsername && envString('MODERATOR').split(',').includes(user.preferredUsername)
}

export const assertCourtId = (user: UserType): number => {
    const mapping = envString('SYSTEM_MAPPING') // e.g. TRF2:4,TRF1:1
    if (mapping) {
        const map = mapping.split(',').map(m => m.split(':')).reduce((acc, [k, v]) => ({ ...acc, [k]: Number(v) }), {} as Record<string, number>)
        if (user?.system && map[user.system]) {
            return map[user.system]
        }
    }
    const courtFromEmail = user.email ? user.email?.match(/@(.+)\.jus\.br/)?.[1] : undefined
    // devLog('Court from email:', courtFromEmail)
    if (courtFromEmail) {
        const courtIdFromEmail = envString(`TRIBUNAL_${slugify(courtFromEmail.replace('-', '_'))}`)
        // devLog('Court ID from email:', courtIdFromEmail)
        if (courtIdFromEmail) {
            return Number(courtIdFromEmail)
        }
    }
    if (user?.corporativo?.[0]?.seq_tribunal_pai) {
        return user.corporativo[0].seq_tribunal_pai
    }
    if (process.env.NODE_ENV === 'development') {
        return 999998 // Default court ID for development
    }
    if (isUserStaging(user)) {
        return 999999 // Default court ID for staging
    }
    throw new Error('Não foi possível identificar o tribunal do usuário')
}

export const assertCurrentUserCorporativo = async () => {
    const user = await assertCurrentUser()
    if (!await isUserCorporativo(user))
        throw new Error('Usuário não é corporativo')
    return user
}

// Helper padronizado para rotas API: lança UnauthorizedError ao invés de redirecionar
export const assertApiUser = async () => {
    const user = await getCurrentUser()
    if (!user) throw new UnauthorizedError('Usuário não autenticado')
    return user
}

