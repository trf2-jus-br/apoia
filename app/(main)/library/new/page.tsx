import { Container } from 'react-bootstrap'
import { assertCurrentUser } from '@/lib/user'
import LibraryForm from '@/app/(main)/library/library-form'
import { IALibraryKind, IALibraryInclusion } from '@/lib/db/mysql-types'

export default async function New(props: { searchParams?: Promise<{ kind?: string }> }) {
  await assertCurrentUser()
  const sp = (await props.searchParams) || {}
  const kind: IALibraryKind = (sp.kind as IALibraryKind) || IALibraryKind.MARKDOWN
  const record = { id: undefined, kind, title: '', content_type: null, content_markdown: '', model_subtype: null, inclusion: IALibraryInclusion.NAO, context: null } as any
  return (
    <Container fluid={false}>
      <h1 className="mt-5 mb-3">Novo Item</h1>
      <LibraryForm record={record} />
    </Container>
  )
}
