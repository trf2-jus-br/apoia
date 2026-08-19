import { getServerSession } from "next-auth/next"
import React from 'react'
import { redirect } from 'next/navigation'
import authOptions from '@/app/api/auth/[...nextauth]/options'
import Redirecting from "./redirecting"

const AuthKeycloak = async ({ searchParams }) => {
    const sp = await searchParams
    const raw = sp?.redirect || sp?.callbackUrl
    // Apenas caminhos relativos da própria aplicação (começam com "/" e não com "//"),
    // para evitar redirect aberto para hosts externos
    const callbackUrl = (typeof raw === 'string' && /^\/(?!\/)/.test(raw)) ? raw : '/'

    const session = await getServerSession(authOptions)
    if (session && session.user) redirect(callbackUrl)

    if (!authOptions.providers.find(provider => provider.name === "Keycloak"))
        throw new Error("Keycloak provider not found")

    return (
        <Redirecting callbackUrl={callbackUrl} />
    )
}
export default AuthKeycloak
