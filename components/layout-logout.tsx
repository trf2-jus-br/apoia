'use client'

import { signOut } from "next-auth/react"

export default function LayoutLogout() {
    const logout = () => {
        signOut()
    }

    return (<button type="button" className="btn btn-link alert-link p-0" style={{ textDecoration: 'underline' }} onClick={() => logout()}>faça o login utilizando CPF e senha</button>)
}