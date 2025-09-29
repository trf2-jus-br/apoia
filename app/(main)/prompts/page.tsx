'use server'

import { Suspense } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { Container, Spinner } from 'react-bootstrap'
import ServerContents from './server-contents'
import { assertModel } from '@/lib/ai/model-server'

export default async function Home() {
    noStore()
    await assertModel()

    return (
        <Suspense fallback={
            <Container className="mt-5" fluid={false}>
                <div className="text-center"><Spinner variant='secondary' /></div>
            </Container>
        }>
            <ServerContents />
        </Suspense>
    )
}