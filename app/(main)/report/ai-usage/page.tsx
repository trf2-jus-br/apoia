import { assertCurrentUser, isUserModerator } from '@/lib/user'
import IAUsageReportClient from './ia-usage-report-client'

async function fetchDollar() {
    const res = await fetch(`${process.env.NEXTAUTH_URL_INTERNAL || ''}/api/v1/report/dollar`, { cache: 'no-cache' })
    if (!res.ok) return null
    const json = await res.json()
    console.log('Dollar rate response:', json)
    return json?.rate || null
}

export default async function IAUsageReportPage() {
    const user = await assertCurrentUser()
    const usdBrl = await fetchDollar()
    console.log('USD/BRL rate:', usdBrl)
    return <IAUsageReportClient usdBrl={usdBrl} isModerator={await isUserModerator(user)} />
}
