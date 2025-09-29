import { getCurrentUser } from '@/lib/user'
import { obterDadosDoProcesso } from '@/lib/proc/process'

export const maxDuration = 60
// export const runtime = 'edge'


/**
 * @swagger
 * 
 * /api/v1/identify-pieces/{number}:
 *   post:
 *     description: Utiliza IA para identificar o tipo das peças que estão marcadas como "OUTROS"
 *     tags:
 *       - batch
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: number 
 *         required: true
 *       - in: header
 *         name: model-and-api-key
 *         schema:
 *           type: string
 *         description: Modelo e chave de API separados por ':', codificados em base64
 *     responses:
 *       200:
 *         description: OK, processo analisado e resultado armazenado no banco de dados
 */
export async function POST(req: Request, props: { params: Promise<{ name: string, number: string }> }) {
  const params = await props.params;
  const { name, number } = params
  try {
    const pUser = getCurrentUser()
    if (!(await pUser)) return Response.json({ errormsg: 'Usuário não autenticado' }, { status: 401 })

    const dadosDoProcesso = await obterDadosDoProcesso({numeroDoProcesso: number, pUser, identificarPecas:true})
    if (dadosDoProcesso.errorMsg) throw new Error(dadosDoProcesso.errorMsg)

    return Response.json({ status: 'OK', dadosDoProcesso })
  } catch (error) {
    console.error('Erro identificando peças', error)
    return Response.json({ errormsg: error.message }, { status: 500 })
  }
}

