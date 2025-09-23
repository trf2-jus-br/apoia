'use server'

import Link from 'next/link'
import { Dao } from '@/lib/db/mysql'
import { assertCurrentUser } from '@/lib/user'
import { deleteLibraryAction } from './actions'

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
            <th>Content-Type</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map(i => (
            <tr key={i.id}>
              <td>{i.title}</td>
              <td>{i.type}</td>
              <td>{i.content_type || '-'}</td>
              <td className="text-end">
                <form action={deleteLibraryAction} style={{ display: 'inline' }}>
                  <input type="hidden" name="id" value={String(i.id)} />
                  <button type="submit" className="btn btn-sm btn-outline-danger me-2">Excluir</button>
                </form>
                <Link href={`/library/${i.id}/edit`} className="btn btn-sm btn-primary">Editar</Link>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={4} className="text-end">
              <div className="btn-group">
                <Link href="/library/new?type=ARQUIVO" className="btn btn-success">Upload de arquivo</Link>
                <button type="button" className="btn btn-success dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                  <span className="visually-hidden">Toggle Dropdown</span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li><Link className="dropdown-item" href="/library/new?type=MODELO">Criar modelo</Link></li>
                  <li><Link className="dropdown-item" href="/library/new?type=MARKDOWN">Documento em branco</Link></li>
                </ul>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
