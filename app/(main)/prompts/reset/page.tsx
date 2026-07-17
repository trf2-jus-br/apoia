import { modeUrl } from '@/lib/utils/prefs'
import { redirect } from 'next/navigation'

export default async function Home() {
  redirect(await modeUrl(`/prompts`))
}
