import { getCurrentUser, assertApiUser } from "@/lib/user"
import { UnauthorizedError, withErrorHandler } from '@/lib/utils/api-error'

async function GET_HANDLER(_req: Request) {
    const user = await assertApiUser()
    delete user.image
    return Response.json(user)
}

export const GET = withErrorHandler(GET_HANDLER as any)