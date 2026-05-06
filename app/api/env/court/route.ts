import { getCurrentUser, assertApiUser } from "@/lib/user"
import { UnauthorizedError, ApiError, withErrorHandler } from '@/lib/utils/api-error'
import { devLog } from "@/lib/utils/log"

async function GET_HANDLER(_req: Request) {
    const user = await assertApiUser()
    // devLog(user)
    if (!user.corporativo?.[0]?.seq_tribunal_pai) throw new ApiError('Código do tribunal não encontrado', 500)
    return Response.json({
        seq_tribunal_pai: user.corporativo[0].seq_tribunal_pai,
        seq_orgao: user.corporativo[0].seq_orgao
    })
}

export const GET = withErrorHandler(GET_HANDLER as any)