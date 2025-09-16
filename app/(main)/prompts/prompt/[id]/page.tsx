'use server'

import { Suspense } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { Dao } from '@/lib/db/mysql'
import { Container, Spinner } from 'react-bootstrap'
import PromptInfoContents from './prompt-info-contents'
import { assertCurrentUser, isUserModerator } from '@/lib/user'

export default async function Home(props: { params: Promise<{ id: number }> }) {
    const params = await props.params;
    noStore()
    const user = await assertCurrentUser()
    const isModerator = await isUserModerator(user)
    const pPrompt = Dao.retrieveLatestPromptByBaseId(params.id)

    return (
        <Container className="mt-5" fluid={false}>
            <h1 className="text-center">Informações de Prompt</h1>
            <Suspense fallback={
                <div className="text-center"><Spinner variant='secondary' /></div>
            }>
                <PromptInfoContents pPrompt={pPrompt} isModerator={isModerator} />
            </Suspense>
        </Container>
    )
}