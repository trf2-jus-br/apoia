import { Container } from 'react-bootstrap'
import { Dao } from '@/lib/db/mysql'
import { assertCurrentUser } from '@/lib/user'
import LibraryForm from '@/app/(main)/library/library-form'

export default async function Edit(props: { params: Promise<{ id: string }> }) {
  await assertCurrentUser()
  const { id } = await props.params
  const record = await Dao.getLibraryById(Number(id))
  if (!record) throw new Error('Item não encontrado')
  // Remove non-serializable/binary field before passing to Client Component
  const { content_binary, ...safe } = record as any
  return (
    <Container fluid={false}>
      <h1 className="mt-5 mb-3">Editar Item</h1>
      <LibraryForm record={safe} />
    </Container>
  )
}
