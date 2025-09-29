import { summarize } from "@/lib/ai/analysis"
import fetcher from "@/lib/utils/fetcher"
import { filterText } from "@/lib/ui/preprocess"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/user"

export const maxDuration = 60
// export const runtime = 'edge'

/**
 * @swagger
 * 
 * /api/v1/process/{number}/piece/{piece}/summary:
 *   get:
 *     description: Resume uma peça processual
 *     tags:
 *       - ai
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
 *       - in: header
 *         name: model-and-api-key
 *         schema:
 *           type: string
 *         description: Modelo e chave de API separados por ':', codificados em base64
 *       - in: query
 *         name: format
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - json
 *             - markdown
 *             - html
 *             - pdf
 *         description: Formato do resultado (json, markdown, html, pdf)
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
 *                   description: OK se a análise foi realizada com sucesso
 *                 product:
 *                   type: object
 *                   properties:
 *                     descr:
 *                       type: string
 *                       description: Descrição do produto
 *                     prompt:
 *                       type: string
 *                       description: Prompt para geração do produto
 *                     generated:
 *                       type: string
 *                       description: Conteúdo gerado
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ number: string, piece: string }> }
) {
  const params = await props.params;
  const user = await getCurrentUser()
  if (!user) return Response.json({ errormsg: 'Usuário não autenticado' }, { status: 401 })

  try {
    const summary = await summarize(params.number, params.piece)
    const content = summary.generatedContent
    const resp = { descr: content.title, prompt: content.promptSlug, generated: filterText(content.generated) }
    return Response.json({ status: 'OK', generatedContent: resp })
  } catch (error) {
    const message = fetcher.processError(error)
    return NextResponse.json({ message: `${message}` }, { status: 405 });
  }
}