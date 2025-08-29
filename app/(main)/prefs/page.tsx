import { Container } from 'react-bootstrap'
import { getPrefs } from '@/lib/utils/prefs'
import { EMPTY_PREFS_COOKIE, PrefsCookieType } from '@/lib/utils/prefs-types'
import PrefsForm from './prefs-form'
import { ModelProvider } from '@/lib/ai/model-types'
import { envString } from '@/lib/utils/env'
import { cookies } from 'next/headers';
import { StatusDeLancamento } from '@/lib/proc/process-types'
import { getSelectedModelParams } from '@/lib/ai/model-server'

// export const runtime = 'edge'
export const preferredRegion = 'home'
export const dynamic = 'force-dynamic'

export default async function Home() {
  const prefs = await getPrefs()

  let initialState: PrefsCookieType = EMPTY_PREFS_COOKIE
  if (prefs)
    initialState = prefs

  const { availableApiKeys, defaultModel, userMayChangeModel, selectableModels } = await getSelectedModelParams()

  const statusCookie = (await cookies()).get('beta-tester')?.value
  const statusDeLancamento = statusCookie ? JSON.parse(statusCookie) : StatusDeLancamento.PUBLICO


  return (<>
    <Container fluid={false}>
      <PrefsForm initialState={initialState} availableApiKeys={availableApiKeys} defaultModel={defaultModel} selectableModels={selectableModels} userMayChangeModel={userMayChangeModel} statusDeLancamento={statusDeLancamento} />
    </Container>
  </>)
}