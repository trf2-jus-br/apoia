import { TipoDeSinteseMap, selecionarPecasPorPadraoComFase } from '@/lib/proc/combinacoes';
import { PecaType } from '@/lib/proc/process-types';
import { BadRequestError, withErrorHandler } from '@/lib/utils/api-error';

export const maxDuration = 60
// export const runtime = 'edge'


/**
 * @swagger
 * /api/v1/select-pieces:
 *   post:
 *     description: Seleciona as peças que serão utilizadas na síntese e identifica a fase atual (quando aplicável)
 *     tags:
 *       - process
 *     parameters:
 *       - in: body
 *         name: body
 *         schema:
 *           type: object
 *           required:
 *             - pieces
 *             - kind
 *           properties:
 *             pieces:
 *               type: array
 *               description: Lista completa de peças do processo (cada peça deve conter ao menos id e descr)
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   descr:
 *                     type: string
 *             kind:
 *               type: string
 *               description: Identificador do tipo de síntese desejado
 *     responses:
 *       200:
 *         description: OK, peças selecionadas
 *         schema:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *               example: OK
 *             selectedIds:
 *               type: array
 *               items:
 *                 type: string
 *             faseAtual:
 *               type: string
 *               nullable: true
 *               description: Última fase identificada pelo mecanismo de matching (pode ser omitida ou null se nenhuma fase for marcada)
 *             fases:
 *               type: array
 *               description: Lista completa (em ordem de detecção) das fases marcadas no padrão correspondente
 *               items:
 *                 type: string
 *       500:
 *         description: Erro interno ao selecionar peças
 */
async function POST_HANDLER(req: Request) {
  const body = await req.json();
  const { pieces, kind } = body;
  if (!pieces || !Array.isArray(pieces) || !kind || !TipoDeSinteseMap[kind]) {
    throw new BadRequestError('Parâmetros inválidos')
  }
  const selecao = selecionarPecasPorPadraoComFase(pieces, TipoDeSinteseMap[kind].padroes)
  const pecasSelecionadas: PecaType[] | null = selecao.pecas
  return Response.json({ status: 'OK', selectedIds: pecasSelecionadas ? pecasSelecionadas.map(p => p.id) : [], faseAtual: selecao.faseAtual, fases: selecao.fases })
}

export const POST = withErrorHandler(POST_HANDLER as any)

