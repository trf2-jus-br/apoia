import fetcher from "@/lib/utils/fetcher"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/user"
import { CargaDeConteudoEnum, obterDadosDoProcesso2 } from "@/lib/proc/process"
import * as Sentry from '@sentry/nextjs'

export const maxDuration = 60
// export const runtime = 'edge'

/**
 * @swagger
 * 
 * /api/v1/process/{number}:
 *   get:
 *     description: Obtem as informações de um processo
 *     tags:
 *       - process
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: number
 *         required: true
 *         description: Número do processo (apenas números)
 *       - in: query
 *         name: kind
 *         required: false
 *         type: string
 *         description: Tipo de síntese para seleção de peças
 *     200:
 *       description: Dados do processo
 *       content:
 *         application/json:
 *           schema:
 *             type: object
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
    const url = new URL(req.url)
    const kind = url.searchParams.get('kind')
    const obterConteudo = url.searchParams.get('selectedPiecesContent') === 'true'
    // if (kind) {
    //   const dadosDoProcesso = await obterDadosDoProcesso({
    //     numeroDoProcesso: params.number, pUser, kind,
    //     conteudoDasPecasSelecionadas: obterConteudo ? CargaDeConteudoEnum.SINCRONO : CargaDeConteudoEnum.NAO
    //   })
    //   return Response.json(dadosDoProcesso)
    // }
    const dadosDoProcesso = await obterDadosDoProcesso2({
      numeroDoProcesso: params.number, pUser,
      conteudoDasPecasSelecionadas: obterConteudo ? CargaDeConteudoEnum.SINCRONO : CargaDeConteudoEnum.NAO
    })
    return Response.json(dadosDoProcesso)
  } catch (error) {
    Sentry.captureException(error, { tags: { route: '/api/v1/process/[number]' } })
    const message = fetcher.processError(error)
    return NextResponse.json({ message: `${message}` }, { status: 405 });
  }
}