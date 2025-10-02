import { analyze } from '@/lib/ai/analysis'
import fetcher from '@/lib/utils/fetcher'
import { NextResponse } from 'next/server'
import { filterText } from '@/lib/ui/preprocess'
import { GeneratedContent } from '@/lib/ai/prompt-types'
import { getCurrentUser, assertApiUser } from '@/lib/user'
import { UnauthorizedError, withErrorHandler } from '@/lib/utils/api-error'

export const maxDuration = 60
// export const runtime = 'edge'

/**
 * @swagger
 * 
 * /api/v1/process/{number}/analysis:
 *   get:
 *     description: Analisa um processo judicial, produzindo resumo das principais peças e gerando o conteúdo dos produtos pertinentes
 *     tags:
 *       - ai
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: number
 *         required: true
 *         description: Número do processo (apenas números)
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
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       descr:
 *                         type: string
 *                         description: Descrição do produto
 *                       prompt:
 *                         type: string
 *                         description: Prompt para geração do produto
 *                       generated:
 *                         type: string
 *                         description: Conteúdo gerado
 */
async function GET_HANDLER(req: Request, props: { params: Promise<{ number: string }> }) {
  const params = await props.params;
  await assertApiUser()

  const url = new URL(req.url)
  const complete: boolean = url.searchParams.get('complete') === 'true'
  const kind: string | undefined = url.searchParams.get('kind')
  const analysis = await analyze(undefined, params.number, kind, complete)
  const resp = analysis.generatedContent.map((content: GeneratedContent) => ({ descr: content.title, prompt: content.promptSlug, generated: filterText(content.generated) }))
  return Response.json({ status: 'OK', products: resp })
}

export const GET = withErrorHandler(GET_HANDLER as any)