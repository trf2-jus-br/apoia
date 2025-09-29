import { getCurrentUser } from "@/lib/user"
import { paramsList } from "@/lib/utils/env"

export async function GET(req: Request) {
    const user = await getCurrentUser()
    if (!user) return Response.json({ errormsg: 'Usuário não autenticado' }, { status: 401 })

    const r: any = {}

    for (const param of paramsList) {
        const value = process.env[param.name]
        r[param.name] = param.public ? (value ? value : null) : (value ? '[hidden]' : null)
    }

    return Response.json(r)
}