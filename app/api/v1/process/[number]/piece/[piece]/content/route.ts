import { summarize } from "@/lib/ai/analysis"
import fetcher from "@/lib/utils/fetcher"
import { filterText } from "@/lib/ui/preprocess"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/user"
import { obterDadosDoProcesso } from "@/lib/proc/process"
import { PecaConteudoType } from "@/lib/proc/process-types"
import * as Sentry from '@sentry/nextjs'

export const maxDuration = 60
// export const runtime = 'edge'

/**
 * @swagger
 * 
 * /api/v1/process/{number}/piece/{piece}/content:
 *   get:
 *     description: Obtem o texto de uma peça processual
 *     tags:
 *       - process
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: number
 *         required: true
 *         description: Número do processo (apenas números)
 *       - in: path
 *         name: piece
 *         required: true
 *         description: Identificador da peça processual (apenas números)
 *     responses:
 *       200:
 *         description: Análise do processo no formato solicitado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: OK se o conteúdo foi obtido com sucesso
 *                 content:
 *                   type: string
 *                   description: Conteúdo da peça processual
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ number: string, piece: string }> }
) {
  const params = await props.params;
  const pUser = getCurrentUser()
  const user = await pUser
  if (!user) return Response.json({ errormsg: 'Usuário não autenticado' }, { status: 401 })

  try {
    const dadosDoProcesso = await obterDadosDoProcesso({ numeroDoProcesso: params.number, pUser, idDaPeca: params.piece })
    if (!dadosDoProcesso.pecas[0].conteudo && dadosDoProcesso.pecas[0].pConteudo) {
      const conteudo: PecaConteudoType = await dadosDoProcesso.pecas[0].pConteudo
      if (conteudo.errorMsg) throw new Error(conteudo.errorMsg)
      dadosDoProcesso.pecas[0].conteudo = conteudo.conteudo
    }
    return Response.json({ status: 'OK', content: dadosDoProcesso.pecas[0].conteudo })
  } catch (error) {
    Sentry.captureException(error, { tags: { route: '/api/v1/process/[number]/piece/[piece]/content' } })
    const message = fetcher.processError(error)
    return NextResponse.json({ message: `${message}` }, { status: 405 });
  }
}