import { Container } from 'react-bootstrap'
import { LibraryDao } from '@/lib/db/dao'
import { assertCurrentUser } from '@/lib/user'
import LibraryForm from '@/app/(main)/library/library-form'
import { getPromptDefinition } from '@/lib/ai/prompt-store'
import { maiusculasEMinusculas } from '@/lib/utils/utils'

export default async function Edit(props: { params: Promise<{ id: string }> }) {
  const user = await assertCurrentUser()
  const { id } = await props.params
  const record = await LibraryDao.getLibraryById(id)
  if (!record) throw new Error('Item não encontrado')
  // Remove non-serializable/binary field before passing to Client Component
  const { content_binary, ...safe } = record as any
  // Documentos criados antes do campo autor existir entram em branco:
  // preenche com o nome do usuario corrente ao editar (somente o dono edita/salva).
  if (!safe.author && safe.is_mine) safe.author = maiusculasEMinusculas(user.name)
  return (
    <Container fluid={false}>
      <h1 className="mt-5 mb-3">{safe.is_mine ? 'Editar Item' : 'Visualizar Item'}</h1>
      <LibraryForm record={safe} promptDefinition={await getPromptDefinition('guideline-a-partir-de-exemplos')} />
    </Container>
  )
}
