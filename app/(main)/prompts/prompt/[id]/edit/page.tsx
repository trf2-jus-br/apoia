import { Container } from 'react-bootstrap'
import PromptForm from '../../prompt-form'
import { PromptDao, UserDao } from '@/lib/db/dao'
import { assertCourtId, assertCurrentUserCorporativo, isUserModerator } from '@/lib/user';
import { PublicError } from '@/lib/utils/public-error';
import { getPromptDefinition } from '@/lib/ai/prompt-store'
import { envStringPrefixed } from '@/lib/utils/env';

export default async function Edit(props: { params: Promise<{ id: number }> }) {
    try {
        const user = await assertCurrentUserCorporativo()
        const params = await props.params;
        const { id } = params

        const record = await PromptDao.retrievePromptById(id)
        if (!record) throw new PublicError('Prompt não encontrado')

        let editingAsModerator = false
        const user_id = await UserDao.assertIAUserId(user.preferredUsername || user.name)
        const isModerator = await isUserModerator(user)
        if (record.created_by !== user_id) {
            if (isModerator)
                editingAsModerator = true
            else
                throw new PublicError('Você não tem permissão para editar este prompt.')
        }

        const seqTribunalPai = user ? '' + (assertCourtId(user)) : undefined
        const hasSeiApiUrl = !!envStringPrefixed('SEI_API_URL', seqTribunalPai)


        const allPrompts = await PromptDao.retrievePromptNamesAndUuids(user_id, isModerator)

        // isBetaTester é lido do AppContext no PromptForm (não é mais passado por prop)
        return (<Container fluid={false}>
            <h1 className="mt-5 mb-3">Edição de Prompt</h1>
            {editingAsModerator && <div className="alert alert-warning">Você está editando este prompt como moderador. As alterações serão salvas mas o autor original será mantido.</div>}
            <PromptForm record={record} allPrompts={allPrompts} templateDefinition={await getPromptDefinition('template-a-partir-de-modelo')} hasSeiApiUrl={hasSeiApiUrl} />
        </Container>)
    } catch (e: any) {
        return (<Container fluid={false}>
            <h1 className="mt-5 mb-3">Edição de Prompt</h1>
            <div className="alert alert-danger">Erro: {e?.message || String(e)}</div>
        </Container>)
    }
}
