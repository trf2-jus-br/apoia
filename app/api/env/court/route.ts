import { getCurrentUser } from "@/lib/user"

export async function GET(req: Request) {
    const pUser = getCurrentUser()
    const user = await pUser
    if (!user) return Response.json({ errormsg: 'Usuário não autenticado' }, { status: 401 })
    if (!user.corporativo?.[0]?.seq_tribunal_pai) return Response.json({ errormsg: 'Código do tribunal não encontrado' }, { status: 500 })
    return Response.json(user.corporativo[0].seq_tribunal_pai)        
}