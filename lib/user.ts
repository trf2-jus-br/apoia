'use server'

import authOptions from '../app/api/auth/[...nextauth]/options'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { headers } from "next/headers"
import { verify } from 'crypto'
import { verifyJweToken, verifyJwkSignedToken } from './utils/jwt'
import { envString } from './utils/env'

export type UserType = {
    id?: number, name: string, email: string, preferredUsername?: string, iss?: string, image: { password: string, system: string }, accessToken?: string, corporativo?: any[], roles?: string[]
}

export const getCurrentUser = async (): Promise<UserType | undefined> => {
    const headersList = await headers()

    const authorization = headersList.get("authorization")
    if (authorization?.startsWith('Bearer PDPJ ')) {
        const pdpjAuthorization = authorization.replace('Bearer PDPJ ', '')
        try {
            const claims: any = await verifyJwkSignedToken(pdpjAuthorization, envString('PDPJ_JWK'))

            // Aggregate roles from realm_access and resource_access
            const roleSet = new Set<string>()
            if (claims?.realm_access?.roles) (claims.realm_access.roles as string[]).forEach(r => roleSet.add(r))
            if (claims?.resource_access) {
                Object.values(claims.resource_access as Record<string, any>).forEach((svc: any) => {
                    (svc?.roles as string[] | undefined)?.forEach(r => roleSet.add(r))
                })
            }
            const roles = Array.from(roleSet)

            // Determine the tribunal from claims
            let seqTribunal: number | undefined = undefined
            if (Array.isArray(claims['allowed-origins']) && claims['allowed-origins'].includes('https://eproc.jfrj.jus.br')) {
                seqTribunal = 4
            }

            return {
                name: claims.name,
                email: claims.email,
                preferredUsername: claims.preferred_username,
                iss: claims.iss,
                accessToken: pdpjAuthorization,
                corporativo: seqTribunal ? [{ seq_tribunal_pai: seqTribunal }] : undefined,
                roles,
                image: { password: undefined as any, system: undefined as any }
            }
        } catch (error) {
            console.error('Invalid pdpj-authorization token:', error)
            return undefined
        }
    }

    if (authorization) {
        const claims: any = await verifyJweToken(authorization)
        return { name: claims.name, email: claims.name, image: { password: claims.password, system: claims.system } }
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
    if (!user) redirect('/auth/signin')
    return user
}

export const isUserStaging = async (user: UserType) => {
    return user.iss === 'https://sso.stg.cloud.pje.jus.br/auth/realms/pje'
}

export const isUserCorporativo = async (user: UserType) => {
    return !!user.corporativo || !!user.image?.system || process.env.NODE_ENV === 'development' || isUserStaging(user)
}

export const isUserModerator = async (user: UserType): Promise<boolean> => {
    return envString('MODERATOR') && user.preferredUsername && envString('MODERATOR').split(',').includes(user.preferredUsername)
}

export const assertCourtId = async (user: UserType): Promise<number> => {
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

