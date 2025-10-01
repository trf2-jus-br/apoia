import { Container } from 'react-bootstrap'
import PromptForm from '../../prompt-form'
import { Dao } from '@/lib/db/mysql'
import { assertCurrentUserCorporativo, isUserModerator } from '@/lib/user';

export default async function Edit(props: { params: Promise<{ id: number }> }) {
    try {
    const user = await assertCurrentUserCorporativo()
    const params = await props.params;
    const { id } = params

    const record = await Dao.retrievePromptById(id)
    if (!record) throw new PublicError('Prompt não encontrado')

    let editingAsModerator = false
    if (record.created_by !== user.id) {
        if (await isUserModerator(user))
            editingAsModerator = true
        else
            throw new PublicError('Você não tem permissão para editar este prompt.')
    }

    return (<Container fluid={false}>
        <h1 className="mt-5 mb-3">Edição de Prompt</h1>
        {editingAsModerator && <div className="alert alert-warning">Você está editando este prompt como moderador. As alterações serão salvas mas o autor original será mantido.</div>}
        <PromptForm record={record} />
    </Container>)
    } catch (e: any) {
        return (<Container fluid={false}>
            <h1 className="mt-5 mb-3">Edição de Prompt</h1>
            <div className="alert alert-danger">Erro: {e?.message || String(e)}</div>
        </Container>)
    }
}
