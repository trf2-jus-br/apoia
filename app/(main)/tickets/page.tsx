import { assertCurrentUser } from '@/lib/user'
import { TicketDao, UserDao } from '@/lib/db/dao'
import TicketsClient from './tickets-client'

export const metadata = { title: 'Meus Chamados' }

export default async function TicketsPage() {
    const user = await assertCurrentUser()
    const userId = await UserDao.assertIAUserId(user.preferredUsername || user.name)
    const items = await TicketDao.listTicketsByUser(userId)
    // Serializa (Date -> string) para passar ao client component
    return <TicketsClient items={JSON.parse(JSON.stringify(items))} />
}
