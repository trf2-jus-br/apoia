import { getServerSession } from "next-auth/next"
// import { getProviders, getSession, signIn } from "next-auth/react"
import React from 'react'
import { redirect } from 'next/navigation'
import Version from '@/components/version'
import Image from 'next/image'
import authOptions from '@/app/api/auth/[...nextauth]/options'
import CredentialsForm from './credentials-form'
import Provider from './provider'
import { systems } from '@/lib/utils/env.ts'


const Signin = async () => {
    const session = await getServerSession(authOptions);
    if (session && session.user) redirect('/')
    const providers = authOptions.providers

    return (
        <div className="p-3 bg-white md:flex-1">
            <div className="container content">
                <div className="px-4 my-3 text-center">
                    <Image src="/apoia-logo-transp.png" width={200} height={200 * 271 / 250} alt="Apoia Logo" className="mb-2" />
                    <Image src="/apoia-logo-texto-transp.png" width={48 * 1102 / 478} height={48} alt="Apoia Logo" className="mb-2" />
                </div>

                {providers &&
                    providers.filter(provider => provider.name === "Credentials").map(provider =>
                        <CredentialsForm key={provider.name} systems={systems.map(o => o.system)} />
                    )}

                <div className="text-center mt-3">
                    {providers &&
                        providers.filter(provider => provider.name !== "Credentials").map(provider =>
                            <Provider key={provider.id} id={provider.id} name={provider.name} />
                        )}
                </div>
            </div >

            {Version()}
        </div>
    )
}
export default Signin
