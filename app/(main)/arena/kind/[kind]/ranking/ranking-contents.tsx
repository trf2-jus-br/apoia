import { updateWithLatestAndOfficial } from '@/lib/db/mysql-types'
import Ranking from './ranking'
import { Dao } from '@/lib/db/mysql'


export default async function RankingContents(props: { kind: string }) {
    const { kind } = props
    const models = await Dao.retrieveModels()
    const prompts = await Dao.retrievePromptsIdsAndNamesByKind(kind)
    const testsets = await Dao.retrieveOfficialTestsetsIdsAndNamesByKind(kind)

    const promptsWithLatestAndOfficial = updateWithLatestAndOfficial(prompts)

    return (
        <Ranking kind={kind} prompts={promptsWithLatestAndOfficial} models={models} testsets={testsets} />
    )
}