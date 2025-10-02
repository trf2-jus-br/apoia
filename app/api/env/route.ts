import { assertApiUser } from "@/lib/user"
import { paramsList } from "@/lib/utils/env"
import { UnauthorizedError, withErrorHandler } from '@/lib/utils/api-error'

async function GET_HANDLER(_req: Request) {
    const user = await assertApiUser()
    const r: any = {}
    for (const param of paramsList) {
        const value = process.env[param.name]
        r[param.name] = param.public ? (value ? value : null) : (value ? '[hidden]' : null)
    }
    return Response.json(r)
}

export const GET = withErrorHandler(GET_HANDLER as any)