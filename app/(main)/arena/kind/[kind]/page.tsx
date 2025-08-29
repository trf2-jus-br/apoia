'use server'

import { Suspense } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { Dao } from '@/lib/db/mysql'
import { formatDate, maiusculasEMinusculas } from '@/lib/utils/utils'
import TablePlaceholder from '@/components/table-placeholder'
import TableRecords from '@/components/table-records'
import { Button, Container } from 'react-bootstrap'
import Link from 'next/link'
import { headers } from "next/headers";

export default async function Home(props: { params: Promise<{ kind: string }> }) {
    const params = await props.params;
    noStore()
    const heads = await headers()
    const pathname = heads.get('next-url')
    const kind = params.kind
    const prompts = await Dao.retrievePromptsByKind(null, kind)
    const testsets = await Dao.retrieveTestsetsByKind(null, kind)

    return (<Container className="mt-5" fluid={false}>
        <h1 className="mb-0">Prompts</h1>
        <Suspense fallback={< TablePlaceholder />} >
            <TableRecords records={prompts} spec="PromptsByKind" linkToAdd="prompts/new" pageSize={10} />
        </Suspense>

        <h1 className="mb-0">Conjuntos de Testes</h1>
        <Suspense fallback={< TablePlaceholder />} >
            <TableRecords records={testsets} spec="TestsetsByKind" linkToAdd="testsets/new" pageSize={10} />
        </Suspense>

        <div className="mt-3">
            <Link href=".." className="btn btn-light">Voltar</Link>
            <Link href={`${kind}/ranking`} className="btn btn-primary float-end">Visualizar o Ranking</Link>
        </div>
    </Container>)
}