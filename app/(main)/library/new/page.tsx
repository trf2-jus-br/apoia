import { Container } from 'react-bootstrap'
import { assertCurrentUser } from '@/lib/user'
import LibraryForm from '@/app/(main)/library/library-form'

export default async function New(props: { searchParams?: Promise<{ type?: string }> }) {
  await assertCurrentUser()
  const sp = (await props.searchParams) || {}
  const type = sp.type || 'MARKDOWN'
  const record = { id: undefined, type, title: '', content_type: null, content_markdown: '', model_subtype: null } as any
  return (
    <Container fluid={false}>
      <h1 className="mt-5 mb-3">Novo Item</h1>
      <LibraryForm record={record} />
    </Container>
  )
}
