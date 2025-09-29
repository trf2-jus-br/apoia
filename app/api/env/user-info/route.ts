import { getSelectedModelParams } from "@/lib/ai/model-server"
import { Dao } from "@/lib/db/mysql"
import { CargaDeConteudoEnum, obterDadosDoProcesso2 } from "@/lib/proc/process"
import { getCurrentUser } from "@/lib/user"
import { paramsList } from "@/lib/utils/env"

export async function GET(req: Request) {
    const pUser = getCurrentUser()
    const user = await pUser
    if (!user) return Response.json({ errormsg: 'Usuário não autenticado' }, { status: 401 })
    delete user.image
    return Response.json(user)
}