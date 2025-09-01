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


const Signin = async ({ searchParams }) => {
    const session = await getServerSession(authOptions);
    if (session && session.user) redirect('/')
    const providers = authOptions.providers

    // Query param handling: systems
    const qp = searchParams?.systems
    let enabledSystems = []
    if (qp === 'all') {
        enabledSystems = systems.map(o => o.system)
    } else if (typeof qp === 'string' && qp.trim().length > 0) {
        const requested = qp.split(',').map(s => s.trim()).filter(Boolean)
        const available = new Set(systems.map(o => o.system))
        enabledSystems = requested.filter(r => available.has(r))
    } // if undefined -> keep empty (omit all)

    const otherProviders = !!(providers && providers.find(provider => provider.name !== "Credentials"))

    return (
        <div className="p-3 bg-white md:flex-1">
            <div className="container content">
                <div className="px-4 my-3 text-center">
                    <Image src="/apoia-logo-transp.png" width={200} height={200 * 271 / 250} alt="Apoia Logo" className="mb-2" />
                    <Image src="/apoia-logo-texto-transp.png" width={48 * 1102 / 478} height={48} alt="Apoia Logo" className="mb-2" />
                </div>

                {(!otherProviders || enabledSystems.length > 0) && providers &&
                    providers.filter(provider => provider.name === "Credentials").map(provider => (
                        <CredentialsForm key={provider.name} systems={enabledSystems} />
                    ))}

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
