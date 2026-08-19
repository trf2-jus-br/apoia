import { Container } from 'react-bootstrap'
import { getPrefs, isBetaTester } from '@/lib/utils/prefs'
import { EMPTY_PREFS_COOKIE, PrefsCookieType } from '@/lib/utils/prefs-types'
import PrefsForm from './prefs-form'
import { StatusDeLancamento } from '@/lib/proc/process-types'
import { getSelectedModelParams } from '@/lib/ai/model-server'
import devLog from '@/lib/utils/log';

export const metadata = { title: 'Preferências' }

// export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export default async function Home() {
  const prefs = await getPrefs()

  let initialState: PrefsCookieType = EMPTY_PREFS_COOKIE
  if (prefs)
    initialState = prefs

  const {
    availableApiKeys,
    defaultModel,
    userMayChangeModel,
    configuredSelectableModels,
    combinedSelectableModels,
    openRouterModels,
    onPremisesModels,
    forceModelInAllSituations } = await getSelectedModelParams()
  const statusDeLancamento = (await isBetaTester()) ? StatusDeLancamento.EM_DESENVOLVIMENTO : StatusDeLancamento.PUBLICO

  return (<>
    <Container fluid={false}>
      <PrefsForm initialState={initialState} availableApiKeys={availableApiKeys} defaultModel={defaultModel}
        configuredSelectableModels={configuredSelectableModels} combinedSelectableModels={combinedSelectableModels}
        userMayChangeModel={userMayChangeModel} forceModelInAllSituations={forceModelInAllSituations}
        statusDeLancamento={statusDeLancamento} openRouterModels={openRouterModels}
        onPremisesModels={onPremisesModels} />
    </Container>
  </>)
}