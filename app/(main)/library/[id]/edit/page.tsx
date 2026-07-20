import { Container } from 'react-bootstrap'
import { LibraryDao } from '@/lib/db/dao'
import { assertCurrentUser } from '@/lib/user'
import LibraryForm from '@/app/(main)/library/library-form'
import { getPromptDefinition } from '@/lib/ai/prompt-store'

export default async function Edit(props: { params: Promise<{ id: string }> }) {
  await assertCurrentUser()
  const { id } = await props.params
  const record = await LibraryDao.getLibraryById(Number(id))
  if (!record) throw new Error('Item não encontrado')
  // Remove non-serializable/binary field before passing to Client Component
  const { content_binary, ...safe } = record as any
  return (
    <Container fluid={false}>
      <h1 className="mt-5 mb-3">{safe.is_mine ? 'Editar Item' : 'Visualizar Item'}</h1>
      <LibraryForm record={safe} promptDefinition={await getPromptDefinition('guideline-a-partir-de-exemplos')} />
    </Container>
  )
}
