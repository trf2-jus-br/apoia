import { Container } from 'react-bootstrap'
import PromptForm from '../prompt-form'
import { PromptDao, UserDao } from '@/lib/db/dao'
import { assertCurrentUser, isUserModerator } from '@/lib/user'
import { maiusculasEMinusculas } from '@/lib/utils/utils'
import { Instance, Matter, Scope } from '@/lib/proc/process-types'
import { PublicError } from '@/lib/utils/public-error'
import { getPromptDefinition } from '@/lib/ai/prompt-store'
import { getMode, isBetaTester } from '@/lib/utils/prefs'

export default async function New(
    props: { params: Promise<{ kind: string }>, searchParams: Promise<{ copyFrom: string, template: string, import: string }> }
) {
    const searchParams = await props.searchParams;
    const params = await props.params;
    const { kind } = params
    const user = await assertCurrentUser()
    const author = maiusculasEMinusculas(user.name)
    const currentMode = await getMode()
    const emptyRecord = {
        share: "PRIVADO",
        mode: currentMode,
        content: {
            scope: Object.keys(Scope),
            author,
            instance: Object.keys(Instance),
            matter: Object.keys(Matter),
            target: "PROCESSO",
            editor_label: "Texto",
            piece_strategy: "MAIS_RELEVANTES",
            piece_descr: [],
            phase: [],
            summary: "NAO",
        }
    }

    let record: any = emptyRecord
    const copyFromId = searchParams.copyFrom
    if (copyFromId) {
        record = await PromptDao.retrievePromptById(parseInt(copyFromId))
        record.share = "PRIVADO"
        if (!record) throw new PublicError('Prompt não encontrado')
        const newName = record.name.replace(/\((\d+)\)$/, (_, n) => `(${Number(n) + 1})`)
        record.name = record.name === newName ? record.name + ' (1)' : newName
        record.content.author = author
        record.base_id = undefined
    }

    const user_id = await UserDao.assertIAUserId(user.preferredUsername || user.name)
    const isModerator = await isUserModerator(user)
    const allPrompts = await PromptDao.retrievePromptNamesAndUuids(user_id, isModerator)
    const betaTester = await isBetaTester()

    return (<Container fluid={false}>
        <h1 className="mt-5 mb-3">Novo</h1>
        <PromptForm record={record} allPrompts={allPrompts} template={!!searchParams.template} importMode={searchParams.import === 'true'} templateDefinition={await getPromptDefinition('template-a-partir-de-modelo')} isBetaTester={betaTester} />
    </Container>)
}