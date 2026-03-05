import { PromptDao } from "@/lib/db/dao"
import { assertCurrentUser } from "@/lib/user"
import NewBatchPage from "./NewBatch"
import { getTiposDeSinteseValido } from "@/lib/proc/info-de-produto"
import { StatusDeLancamento } from "@/lib/proc/process-types"

export default async function BatchPanel(props: { params: Promise<{ id: string }> }) {
    const user = await assertCurrentUser()
    let favorites = (await PromptDao.retrieveFavoriteLatestPromptsForCurrentUser())
    favorites = favorites?.filter(f => f.target === 'PROCESSO' && !f.name?.startsWith('^'))
    const allTypes = await getTiposDeSinteseValido()
    const synthesisTypes = allTypes
        .filter(t => t.status <= StatusDeLancamento.PUBLICO)
        .map(t => ({ id: t.id, nome: t.nome, batchReport: t.batchReport }))
    return <NewBatchPage favorites={favorites} synthesisTypes={synthesisTypes} />
}
