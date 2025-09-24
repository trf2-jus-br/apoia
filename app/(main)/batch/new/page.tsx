import { Dao } from "@/lib/db/mysql"
import { assertCurrentUser } from "@/lib/user"
import NewBatchPage from "./NewBatch"

export default async function BatchPanel(props: { params: Promise<{ id: string }> }) {
    const user = await assertCurrentUser()
    let favorites = (await Dao.retrieveFavoriteLatestPromptsForCurrentUser())
    favorites = favorites?.filter(f => f.target === 'PROCESSO' && !f.name?.startsWith('^'))
    return <NewBatchPage favorites={favorites} />
}
