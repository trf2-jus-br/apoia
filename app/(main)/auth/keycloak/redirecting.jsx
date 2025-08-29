'use client'

import { signIn } from "next-auth/react"
import { useEffect } from 'react'

import { useSession } from "next-auth/react"

const AutoLogin = () => {
    useEffect(() => {
        signIn('keycloak')
    }, [])

    return (
        <div className="px-4 py-1 my-1 mt-5 text-center">
            <div className="col-lg-6 mx-auto">
                <p className="alert alert-light">Você será redirecionado para o sistema de autenticação...</p>
            </div>
        </div>
    )
}

export default AutoLogin