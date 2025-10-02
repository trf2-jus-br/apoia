import { getCurrentUser, assertApiUser } from "@/lib/user"
import { UnauthorizedError, ApiError, withErrorHandler } from '@/lib/utils/api-error'

async function GET_HANDLER(_req: Request) {
    const user = await assertApiUser()
    if (!user.corporativo?.[0]?.seq_tribunal_pai) throw new ApiError('Código do tribunal não encontrado', 500)
    return Response.json(user.corporativo[0].seq_tribunal_pai)
}

export const GET = withErrorHandler(GET_HANDLER as any)