'use server'

import { Suspense } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import ServerContents from './server-contents'

export default async function Page() {
  noStore()
  return (
    <Suspense fallback={<div className="container mt-5 text-center">Carregando…</div>}>
      <ServerContents />
    </Suspense>
  )
}
