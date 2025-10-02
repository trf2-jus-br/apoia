import { getCurrentUser } from "@/lib/user"

export async function GET(req: Request) {
    const pUser = getCurrentUser()
    const user = await pUser
    if (!user) return Response.json({ errormsg: 'Usuário não autenticado' }, { status: 401 })
    delete user.image
    return Response.json(user)
}