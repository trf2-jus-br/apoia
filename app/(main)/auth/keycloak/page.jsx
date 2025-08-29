import { getServerSession } from "next-auth/next"
import React from 'react'
import { redirect } from 'next/navigation'
import authOptions from '@/app/api/auth/[...nextauth]/options'
import Redirecting from './redirecting'

const AuthKeycloak = async () => {
    const session = await getServerSession(authOptions);
    if (session && session.user) redirect('/')
    if (!authOptions.providers.find(provider => provider.name === "Keycloak")) 
        throw new Error("Keycloak provider not found")

    return (
        <Redirecting />
    )
}
export default AuthKeycloak
