import { Suspense } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { PromptDao } from '@/lib/db/dao'
import TablePlaceholder from '@/components/table-placeholder'
import TableRecords from '@/components/table-records'
import { Container } from 'react-bootstrap'

export default async function Home(props: { params: Promise<{ kind: string, slug: string }> }) {
    const params = await props.params;
    noStore()
    const { kind, slug } = params
    const records = await PromptDao.retrievePromptsByKindAndSlug(kind, slug)

    return (<Container className="mt-3" fluid={false}>
        <h1 className="mb-0">Versões do Prompt {kind.toUpperCase()} - {slug.toUpperCase()}</h1>
        <Suspense fallback={< TablePlaceholder />} >
            <TableRecords records={records} spec="PromptsByKindAndSlug" linkToBack="../.." pageSize={20} />
        </Suspense>
    </Container>)
}