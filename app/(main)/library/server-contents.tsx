'use server'

import Link from 'next/link'
import { Dao } from '@/lib/db/mysql'
import { assertCurrentUser } from '@/lib/user'
import { deleteLibraryAction } from './actions'
import { IALibraryKindLabels, IALibraryInclusionLabels } from '@/lib/db/mysql-types'
import { Button } from 'react-bootstrap'

export default async function ServerContents() {
  await assertCurrentUser()
  const items = await Dao.listLibrary()
  return (
    <div className="container">
      <h1 className="mt-5 mb-3">Biblioteca</h1>
      <table className="table table-bordered table-hover">
        <thead>
          <tr>
            <th>Título</th>
            <th>Tipo</th>
            <th>Inclusão</th>
            <th>Contexto</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map(i => (
            <tr key={i.id}>
              <td>{i.title}</td>
              <td>{IALibraryKindLabels[i.kind]}</td>
              <td>{i.inclusion ? IALibraryInclusionLabels[i.inclusion] : IALibraryInclusionLabels.NAO}</td>
              <td>{i.context ? (i.context.length > 50 ? i.context.substring(0, 50) + '...' : i.context) : '-'}</td>
              <td className="text-end">
                <form action={deleteLibraryAction} style={{ display: 'inline' }}>
                  <input type="hidden" name="id" value={String(i.id)} />
                  <button type="submit" className="btn btn-sm btn-outline-danger me-2">Excluir</button>
                </form>
                <Link href={`/library/${i.id}/edit`} className="btn btn-sm btn-primary">Editar</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-end">
        <Link href="/library/new?kind=MARKDOWN" className="btn btn-primary">Criar Documento</Link>
      </div>
    </div>
  )
}
