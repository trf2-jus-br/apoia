import { NextResponse } from "next/server"
import { getCurrentUser, assertApiUser } from "@/lib/user"
import { decrypt } from "@/lib/utils/crypt"
import { getInterop } from "@/lib/interop/interop"
import { getMode } from "@/lib/utils/prefs"
import * as Sentry from '@sentry/nextjs'
import { UnauthorizedError, withErrorHandler, ForbiddenError, NotFoundError } from '@/lib/utils/api-error'
import { assertNivelDeSigilo } from "@/lib/proc/sigilo"

export const maxDuration = 60
// export const runtime = 'edge'

/**
 * @swagger
 * 
 * /api/v1/process/{number}/piece/{piece}/binary:
 *   get:
 *     description: Obtem o conteúdo binário de uma peça processual
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
async function GET_HANDLER(
  _req: Request,
  props: { params: Promise<{ number: string, piece: string }> }
) {
  const params = await props.params;
  const pUser = assertApiUser()
  const user = await pUser

  const username = user?.email
  const password = user?.encryptedPassword ? decrypt(user?.encryptedPassword) : undefined
  const system = user?.system

  // A decisao entre SEI/PDPJ/MNI/Balcaojus fica centralizada em getInterop.
  // A resolução de SEI_API_URL (prefixada por tribunal) acontece no init() do
  // InteropSEI a partir de getCurrentUser(), como o InteropPDPJ já faz.
  const mode = await getMode()
  const interop = getInterop(system, username, password, mode)
  await interop.init()

  // Obter metadados do processo para verificar sigilo da peça
  const arrayDeDadosDoProcesso = await interop.consultarProcesso(params.number)
  if (!arrayDeDadosDoProcesso || arrayDeDadosDoProcesso.length === 0) {
    throw new NotFoundError(`Processo ${params.number} não encontrado`)
  }

  // Localizar a peça nos dados do processo
  let pecaEncontrada = null
  for (const dadosDoProcesso of arrayDeDadosDoProcesso) {
    const peca = dadosDoProcesso.pecas?.find(p => p.id === params.piece)
    if (peca) {
      pecaEncontrada = peca
      break
    }
  }

  if (!pecaEncontrada) {
    throw new NotFoundError(`Peça ${params.piece} não encontrada no processo ${params.number}`)
  }

  // Validar nível de sigilo da peça
  assertNivelDeSigilo(user, pecaEncontrada.sigilo, pecaEncontrada.descr)

  const { buffer, contentType } = await interop.obterPeca(params.number, params.piece, true)

  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
    },
    status: 200,
  })
}

export const GET = withErrorHandler(GET_HANDLER as any)