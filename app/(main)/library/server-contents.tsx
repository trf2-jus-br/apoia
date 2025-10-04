'use server'

import Link from 'next/link'
import { Dao } from '@/lib/db/mysql'
import { assertCurrentUser } from '@/lib/user'
import Table from '@/components/table-records'

export default async function ServerContents() {
  await assertCurrentUser()
  const items = await Dao.listLibrary()

  return (
    <div className="container">
      <h1 className="mt-5 mb-3">Biblioteca</h1>
      <Table 
        records={items} 
        spec="Library" 
        pageSize={10}
      >
        <div className="col col-auto mb-0">
          <Link href="/library/new?kind=MARKDOWN" className="btn btn-primary">Criar Documento</Link>
        </div>
      </Table>
    </div>
  )
}
