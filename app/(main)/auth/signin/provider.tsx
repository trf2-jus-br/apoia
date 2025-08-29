'use client'

import { signIn } from "next-auth/react"

const Provider = (params) => {
    return (
        <div className="px-4 py-1 my-1 text-center">
            <div className="col-lg-6 mx-auto">
                <a className="btn btn-dark" id={params.id} style={{ width: '100%' }} href="#" onClick={() => signIn(params.id)}>
                    <span>Acessar com {params.name === 'Keycloak' ? 'PDPJ' : params.name}</span>
                </a>
            </div>
        </div>
    )
}

export default Provider