'use server'

import { Suspense } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { Dao } from '@/lib/db/mysql'
import { formatDate, maiusculasEMinusculas } from '@/lib/utils/utils'
import TablePlaceholder from '@/components/table-placeholder'
import TableRecords from '@/components/table-records'
import { Container } from 'react-bootstrap'
import { internalPrompts } from '@/lib/ai/prompt'
import { assertCurrentUser } from '@/lib/user'
import { assertModel } from '@/lib/ai/model-server'

export default async function Home() {
    noStore()
    await assertCurrentUser()
    await assertModel()

    const records = (await Dao.retrieveCountersByPromptKinds()).filter(r => r.kind)
    const promptKinds = Object.entries(internalPrompts).map(([kind, prompt]) => ({ kind, prompts: 0, testsets: 0 }))
    promptKinds.forEach(promptKind => {
        if (!records.find(r => r.kind === promptKind.kind)) {
            records.push(promptKind)
        }
    })
    records.sort((a, b) => a.kind.localeCompare(b.kind))

    return (<Container className="mt-5" fluid={false}>
        <h1 className="mb-0">Tipos de Prompts</h1>
        <Suspense fallback={< TablePlaceholder />} >
            <TableRecords records={records} spec="CountersByPromptKinds" pageSize={20} />
        </Suspense>
    </Container>)
}