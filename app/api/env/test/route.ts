import { SystemDao } from "@/lib/db/dao"
import { assertApiUser } from "@/lib/user"
import { withErrorHandler } from '@/lib/utils/api-error'

async function GET_HANDLER(req: Request) {
    await assertApiUser()
    const systemId = await SystemDao.assertSystemId('PDPJ')

    const r: any = {
        pass: undefined,
        tests: [
            {
                name: 'database',
                descr: 'verifica se o banco de dados está acessível',
                pass: !!systemId
            },
        ]
    }

    r.pass = Object.values(r.tests).every(v => v === true)

    return Response.json(r)
}

export const GET = withErrorHandler(GET_HANDLER as any)
