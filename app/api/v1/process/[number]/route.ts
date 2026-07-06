import fetcher from "@/lib/utils/fetcher"
import { NextResponse, NextRequest } from "next/server"
import { assertApiUser } from "@/lib/user"
import { CargaDeConteudoEnum, obterDadosDoProcesso2 } from "@/lib/proc/process"
import { withErrorHandler } from "@/lib/utils/api-error"
import { getAnonymize } from "@/lib/utils/prefs"
import { anonymizeNames } from "@/lib/anonym/name-anonymizer"

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
async function GET_HANDLER(
  req: NextRequest,
  props: { params: Promise<{ number: string, piece: string }> }
) {
  const { params } = props;
  const number = (await params).number
  const pUser = assertApiUser()
  const user = await pUser

  const url = new URL(req.url)
  const kind = url.searchParams.get('kind')
  const obterConteudo = url.searchParams.get('selectedPiecesContent') === 'true'
  const dadosDoProcesso = await obterDadosDoProcesso2({
    numeroDoProcesso: number, pUser,
    conteudoDasPecasSelecionadas: obterConteudo ? CargaDeConteudoEnum.SINCRONO : CargaDeConteudoEnum.NAO
  })

  const anonymize = await getAnonymize()
  if (anonymize && dadosDoProcesso?.arrayDeDadosDoProcesso) {
    for (const d of dadosDoProcesso.arrayDeDadosDoProcesso) {
      if (d.poloAtivo) d.poloAtivo = anonymizeNames(d.poloAtivo).text
      if (d.poloPassivo) d.poloPassivo = anonymizeNames(d.poloPassivo).text
    }
  }

  return NextResponse.json(dadosDoProcesso)
}

export const GET = withErrorHandler(GET_HANDLER)