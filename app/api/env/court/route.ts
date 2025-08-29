import { getSelectedModelParams } from "@/lib/ai/model-server"
import { Dao } from "@/lib/db/mysql"
import { CargaDeConteudoEnum, obterDadosDoProcesso2 } from "@/lib/proc/process"
import { getCurrentUser } from "@/lib/user"
import { paramsList } from "@/lib/utils/env"

export async function GET(req: Request) {
    const pUser = getCurrentUser()
    const user = await pUser
    if (!user) return Response.json({ errormsg: 'Unauthorized' }, { status: 401 })
    if (!user.corporativo?.[0]?.seq_tribunal_pai) return Response.json({ errormsg: 'Código do tribunal não encontrado' }, { status: 500 })
    return Response.json(user.corporativo[0].seq_tribunal_pai)        
}