import { sub } from "@mdxeditor/editor"
import { EnumOfObjectsValueType } from "../ai/model-types"
import { maiusculasEMinusculas, slugify } from "../utils/utils"
import { ANY, Documento, Evento, SequenceItem, isDocumento, EXACT, matchFull, MatchOperator, MatchFullResult, OR, SOME, PHASE, EVENT, EventMatch, ALT } from "./pattern"
import { PecaType } from "./process-types"
import { InteropMovimentoComDocumentosType } from "../interop/interop-types"

// Enum com os tipos de peças
export enum T {
    TEXTO = 'TEXTO',
    PETICAO_INICIAL = 'PETIÇÃO INICIAL',
    PETICAO = 'PETIÇÃO',
    EMENDA_DA_INICIAL = 'EMENDA DA INICIAL',
    CONTESTACAO = 'CONTESTAÇÃO',
    DEFESA_PREVIA_DEFESA_PRELIMINAR_RESPOSTA_DO_REU = 'DEFESA PRÉVIA/DEFESA PRELIMINAR/RESPOSTA DO RÉU',
    INFORMACAO_EM_MANDADO_DE_SEGURANCA = 'INFORMAÇÃO EM MANDADO DE SEGURANÇA',
    REPLICA = 'RÉPLICA',
    LAUDO = 'LAUDO',
    LAUDO_PERICIA = 'LAUDO/PERÍCIA',
    CERTIDAO = 'CERTIDÃO',
    CADASTRO_NACIONAL_DE_INFORMACOES_SOCIAIS = 'CADASTRO NACIONAL DE INFORMAÇÕES SOCIAIS',
    PERFIL_PROFISSIOGRAFICO_PREVIDENCIARIO = 'PERFIL PROFISSIOGRÁFICO PREVIDENCIÁRIO',
    DESPACHO_DECISAO = 'DESPACHO/DECISÃO',
    TERMO_DE_AUDIENCIA = 'TERMO DE AUDIÊNCIA',
    SENTENCA = 'SENTENÇA',
    EMBARGOS_DE_DECLARACAO = 'EMBARGOS DE DECLARAÇÃO',
    APELACAO = 'APELAÇÃO',
    CONTRARRAZOES_AO_RECURSO_DE_APELACAO = 'CONTRARRAZÕES AO RECURSO DE APELAÇÃO',
    AGRAVO = 'AGRAVO',
    AGRAVO_DE_INSTRUMENTO = 'AGRAVO DE INSTRUMENTO',
    AGRAVO_INTERNO = 'AGRAVO INTERNO',
    RECURSO = 'RECURSO',
    RECURSO_INOMINADO = 'RECURSO INOMINADO',
    RECURSO_EXTRAORDINARIO = 'RECURSO EXTRAORDINÁRIO',
    RECURSO_ESPECIAL = 'RECURSO ESPECIAL',
    CONTRARRAZOES = 'CONTRARRAZÕES',
    CONTRARRAZOES_AO_RECURSO_EXTRAORDINARIO = 'CONTRARRAZÕES AO RECURSO EXTRAORDINÁRIO',
    CONTRARRAZOES_AO_RECURSO_ESPECIAL = 'CONTRARRAZÕES AO RECURSO ESPECIAL',
    RELATORIO = 'RELATÓRIO',
    RELATORIO_E_VOTO = 'RELATÓRIO/VOTO',
    EXTRATO_DE_ATA = 'EXTRATO DE ATA',
    VOTO = 'VOTO',
    ACORDAO = 'ACÓRDÃO',
    FORMULARIO = 'FORMULÁRIO',
    PARECER = 'PARECER',
    ATESTADO_DE_PERMANENCIA = 'ATESTADO DE PERMANÊNCIA',
}

export enum Plugin {
    TRIAGEM = 'Triagem',
    NORMAS = 'Normas',
    PALAVRAS_CHAVE = 'Palavras-Chave',
    TRIAGEM_JSON = 'Triagem JSON',
    NORMAS_JSON = 'Normas JSON',
    PALAVRAS_CHAVE_JSON = 'Palavras-Chave JSON',
}

// Enum com as fases processuais
const FaseProcessualArray = [
    { id: 1, name: 'DESPACHO_INICIAL', descr: 'Despacho Inicial' },
    { id: 1, name: 'CONHECIMENTO', descr: 'Conhecimento' },
    { id: 2, name: 'CONHECIMENTO_CONCLUIDA', descr: 'Conhecimento (concluída)' },
    { id: 7, name: 'TURMA_RECURSAL', descr: 'Turma Recursal' },
    { id: 8, name: 'TURMA_RECURSAL_CONCLUIDA', descr: 'Turma Recursal (concluída)' },
    { id: 5, name: 'AGRAVO', descr: 'Agravo' },
    { id: 6, name: 'AGRAVO_CONCLUIDA', descr: 'Agravo (concluída)' },
    { id: 3, name: 'APELACAO', descr: 'Apelação' },
    { id: 4, name: 'APELACAO_CONCLUIDA', descr: 'Apelação (concluída)' },
    { id: 9, name: 'VIABILIDADE_RECURSO_EXTRAORDINARIO', descr: 'Viabilidade de Recurso Extraordinário' },
    { id: 10, name: 'VIABILIDADE_RECURSO_ESPECIAL', descr: 'Viabilidade de Recurso Especial' },
    { id: 11, name: 'EMBARGOS_DE_DECLARACAO_EM_ACORDAO', descr: 'Embargos de Declaração em Acórdão' },
    { id: 12, name: 'AGRAVO_INTERNO', descr: 'Agravo Interno' },
]

export type FaseProcessualValueType = EnumOfObjectsValueType & { descr: string }
export type FaseProcessualType = { [key: string]: FaseProcessualValueType }
export const FaseProcessual: FaseProcessualType = FaseProcessualArray.reduce((acc, cur, idx) => {
    acc[cur.name] = { ...cur, sort: idx + 1 }
    return acc
}, {} as FaseProcessualType)

// Grupos de Síntese - agrupam tipos de síntese relacionados
export interface GrupoDeSinteseType {
    slug: string
    title: string
    description: string
    icone?: string  // nome do ícone FontAwesome (ex: 'faGavel')
    cor?: string    // classe CSS de cor (ex: 'text-primary')
}

export const GrupoDeSinteseMap: Record<string, GrupoDeSinteseType> = {
    DECISAO_DE_VIABILIDADE: {
        slug: 'decisao-de-viabilidade',
        title: 'Admissibilidade de Recursos',
        description: 'Ferramentas para análise de viabilidade de recursos extraordinários e especiais',
        icone: 'faBalanceScale',
        cor: 'text-info'
    },
}

export type GrupoDeSinteseEnum = keyof typeof GrupoDeSinteseMap

// export type ExibitionContextActionType = 'processo_selecionar' | 'minuta_editar'

// export type ContextoDeExibicaoType = {
//     action?: ExibitionContextActionType | ExibitionContextActionType[],
//     document?: string | string[],
//     instance?: string | string[],
//     matter?: string | string[],
//     scope?: string | string[],
// }

// export type TipoDeSinteseType = {
//     nome: string,
//     author?: string,
//     // tipos: T[][],
//     target?: 'PROCESSO' | 'TEXTO' | 'CHAT' | 'REFINAMENTO',
//     padroes?: MatchOperator[][],
//     produtos: (P | ProdutoCompleto)[],
//     sort: number,
//     status: StatusDeLancamento,
//     batchReport?: boolean,
//     // Optional UI filter hints; if omitted, defaults to all
//     scope?: string[],
//     instance?: string[],
//     matter?: string[],
//     // Grupo ao qual este tipo de síntese pertence
//     group?: GrupoDeSinteseType,
//     context?: ContextoDeExibicaoType
// }

const pecasQueRepresentamContestacao = [
    T.CONTESTACAO,
    T.INFORMACAO_EM_MANDADO_DE_SEGURANCA,
    T.DEFESA_PREVIA_DEFESA_PRELIMINAR_RESPOSTA_DO_REU,
]

export const pecasRelevantes1aInstancia = [
    T.PETICAO_INICIAL,
    T.PETICAO,
    T.EMENDA_DA_INICIAL,
    ...pecasQueRepresentamContestacao,
    T.REPLICA,
    T.DESPACHO_DECISAO,
    T.SENTENCA,
    T.LAUDO,
    T.LAUDO_PERICIA,
    T.CADASTRO_NACIONAL_DE_INFORMACOES_SOCIAIS,
    T.PERFIL_PROFISSIOGRAFICO_PREVIDENCIARIO,
    T.PARECER,
    T.CERTIDAO,
    T.ATESTADO_DE_PERMANENCIA,
]

const pecasQueIniciamFaseDeConhecimento = [
    T.PETICAO_INICIAL,
]

const pecasQueIniciamFaseDeTurmaRecursal = [
    T.RECURSO_INOMINADO,
]

const pecasQueIniciamFaseDeRecursoDe2aInstancia = [
    T.APELACAO,
    T.RECURSO,
    T.AGRAVO,
    T.AGRAVO_DE_INSTRUMENTO,
];

const pecasQueIniciamFases = [
    ...pecasQueIniciamFaseDeConhecimento,
    ...pecasQueIniciamFaseDeTurmaRecursal,
    ...pecasQueIniciamFaseDeRecursoDe2aInstancia
]

const pecasQueFinalizamFaseDeConhecimento = [
    T.SENTENCA,
]

const pecasQueFinalizamFaseDeTurmaRecursal = [
    T.ACORDAO,
]

const pecasQueFinalizamFaseDeRecursoDe2aInstancia = [
    T.ACORDAO,
]

export const pecasQueFinalizamFases = [
    ...pecasQueFinalizamFaseDeConhecimento,
    ...pecasQueFinalizamFaseDeTurmaRecursal,
    ...pecasQueFinalizamFaseDeRecursoDe2aInstancia
]

const pecasQueRepresentamAgravoPara2aInstancia = [
    T.AGRAVO,
    T.AGRAVO_DE_INSTRUMENTO,
]

const pecasQueRepresentamRecursoPara2aInstancia = [
    T.APELACAO,
    T.RECURSO,
    T.AGRAVO_INTERNO,
    T.EMBARGOS_DE_DECLARACAO,
]

const pecasRelevantes2aInstanciaContrarrazoes = [
    T.CONTRARRAZOES,
    T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO
]

const pecasRelevantes2aInstanciaRecursos = [
    ...pecasQueRepresentamAgravoPara2aInstancia,
    ...pecasQueRepresentamRecursoPara2aInstancia,
    ...pecasRelevantes2aInstanciaContrarrazoes,
    T.PARECER,
]

const pecasRelevantesDaFaseDeConhecimentoPara2aInstancia = [
    T.PERFIL_PROFISSIOGRAFICO_PREVIDENCIARIO,
]

const pecasRelevantes2aInstancia = [
    ...pecasRelevantes2aInstanciaRecursos,
    ...pecasRelevantes2aInstanciaContrarrazoes
]

const pecasRelevantesViabilidadeDeRecursoExtraordinario = [
    T.RECURSO_EXTRAORDINARIO,
    T.CONTRARRAZOES_AO_RECURSO_EXTRAORDINARIO,
]

const subpadraoEmbargosDeDeclaracaoEmAcordao = [
    ANY({
        capture: [T.RELATORIO, T.RELATORIO_E_VOTO, T.VOTO, T.ACORDAO], greedy: true, except: pecasQueFinalizamFases
    }),
    PHASE(FaseProcessual.EMBARGOS_DE_DECLARACAO_EM_ACORDAO.name),
    EXACT(T.ACORDAO),
    ANY({
        greedy: false, except: pecasQueFinalizamFases
    }),
    EXACT(T.EMBARGOS_DE_DECLARACAO),
    ANY({
        capture: [T.EMBARGOS_DE_DECLARACAO, T.CONTRARRAZOES], greedy: true, except: pecasQueFinalizamFases
    }),
]

export const padraoEmbargosDeDeclaracaoEmAcordao = [
    ANY(),
    ...subpadraoEmbargosDeDeclaracaoEmAcordao
]

const subpadraoViabilidadeDeRecursoExtraordinarioComContrarrazoes = [
    ANY({
        capture: [T.RELATORIO, T.RELATORIO_E_VOTO, T.VOTO, T.ACORDAO], greedy: true, except: pecasQueFinalizamFases
    }),
    PHASE(FaseProcessual.VIABILIDADE_RECURSO_EXTRAORDINARIO.name),
    EXACT(T.ACORDAO),
    ANY({
        greedy: false, except: pecasQueFinalizamFases
    }),
    EXACT(T.RECURSO_EXTRAORDINARIO),
    ANY({
        except: pecasQueFinalizamFases
    }),
    EXACT(T.CONTRARRAZOES_AO_RECURSO_EXTRAORDINARIO),
    ANY({
        capture: [], greedy: true, except: pecasQueFinalizamFases
    }),
]

const subpadraoViabilidadeDeRecursoExtraordinario = [
    ANY({
        capture: [T.RELATORIO, T.RELATORIO_E_VOTO, T.VOTO, T.ACORDAO], greedy: true, except: pecasQueFinalizamFases
    }),
    PHASE(FaseProcessual.VIABILIDADE_RECURSO_EXTRAORDINARIO.name),
    EXACT(T.ACORDAO),
    ANY({
        greedy: false, except: pecasQueFinalizamFases
    }),
    EXACT(T.RECURSO_EXTRAORDINARIO),
    ANY({
        capture: [T.CONTRARRAZOES_AO_RECURSO_EXTRAORDINARIO], greedy: true, except: pecasQueFinalizamFases
    }),
]


export const padraoViabilidadeDeRecursoExtraordinarioComContrarrazoes = [
    ANY(),
    ...subpadraoViabilidadeDeRecursoExtraordinarioComContrarrazoes
]

export const padraoViabilidadeDeRecursoExtraordinario = [
    ANY(),
    ...subpadraoViabilidadeDeRecursoExtraordinario
]

export const padraoViabilidadeDeRecursoExtraordinarioComEmbargosDeDeclaracaoComContrarrazoes = [
    ANY(),
    ...subpadraoEmbargosDeDeclaracaoEmAcordao,
    ...subpadraoViabilidadeDeRecursoExtraordinarioComContrarrazoes
]

export const padraoViabilidadeDeRecursoExtraordinarioComEmbargosDeDeclaracao = [
    ANY(),
    ...subpadraoEmbargosDeDeclaracaoEmAcordao,
    ...subpadraoViabilidadeDeRecursoExtraordinario
]

const subpadraoViabilidadeDeRecursoEspecialComContrarrazoes = [
    ANY({
        capture: [T.RELATORIO, T.RELATORIO_E_VOTO, T.VOTO, T.ACORDAO], greedy: true, except: pecasQueFinalizamFases
    }),
    PHASE(FaseProcessual.VIABILIDADE_RECURSO_ESPECIAL.name),
    EXACT(T.ACORDAO),
    ANY({
        greedy: false, except: pecasQueFinalizamFases
    }),
    EXACT(T.RECURSO_ESPECIAL),
    ANY({
        except: pecasQueFinalizamFases
    }),
    EXACT(T.CONTRARRAZOES_AO_RECURSO_ESPECIAL),
    ANY({
        capture: [], greedy: true, except: pecasQueFinalizamFases
    }),
]

const subpadraoViabilidadeDeRecursoEspecial = [
    ANY({
        capture: [T.RELATORIO, T.RELATORIO_E_VOTO, T.VOTO, T.ACORDAO], greedy: true, except: pecasQueFinalizamFases
    }),
    PHASE(FaseProcessual.VIABILIDADE_RECURSO_ESPECIAL.name),
    EXACT(T.ACORDAO),
    ANY({
        greedy: false, except: pecasQueFinalizamFases
    }),
    EXACT(T.RECURSO_ESPECIAL),
    ANY({
        capture: [T.CONTRARRAZOES_AO_RECURSO_ESPECIAL], greedy: true, except: pecasQueFinalizamFases
    }),
]

export const padraoViabilidadeDeRecursoEspecialComContrarrazoes = [
    ANY(),
    ...subpadraoViabilidadeDeRecursoEspecialComContrarrazoes
]

export const padraoViabilidadeDeRecursoEspecial = [
    ANY(),
    ...subpadraoViabilidadeDeRecursoEspecial
]

export const padraoViabilidadeDeRecursoEspecialComEmbargosDeDeclaracao = [
    ANY(),
    ...subpadraoEmbargosDeDeclaracaoEmAcordao,
    ...subpadraoViabilidadeDeRecursoEspecial
]

export const padraoViabilidadeDeRecursoEspecialComEmbargosDeDeclaracaoComContrarrazoes = [
    ANY(),
    ...subpadraoEmbargosDeDeclaracaoEmAcordao,
    ...subpadraoViabilidadeDeRecursoEspecialComContrarrazoes
]

export const padroesViabilidadeDeRecursoEspecial = [
    padraoViabilidadeDeRecursoEspecialComEmbargosDeDeclaracaoComContrarrazoes,
    padraoViabilidadeDeRecursoEspecialComContrarrazoes,
    padraoViabilidadeDeRecursoEspecialComEmbargosDeDeclaracao,
    padraoViabilidadeDeRecursoEspecial,
]


export const padroesViabilidadeDeRecursoExtraordinario = [
    padraoViabilidadeDeRecursoExtraordinarioComEmbargosDeDeclaracaoComContrarrazoes,
    padraoViabilidadeDeRecursoExtraordinarioComContrarrazoes,
    padraoViabilidadeDeRecursoExtraordinarioComEmbargosDeDeclaracao,
    padraoViabilidadeDeRecursoExtraordinario,
]


export const padroesViabilidadeDeRecursosExtraordinarioEEspecial = [
    padraoViabilidadeDeRecursoEspecialComEmbargosDeDeclaracaoComContrarrazoes,
    padraoViabilidadeDeRecursoEspecialComContrarrazoes,
    padraoViabilidadeDeRecursoEspecialComEmbargosDeDeclaracao,
    padraoViabilidadeDeRecursoExtraordinarioComEmbargosDeDeclaracaoComContrarrazoes,
    padraoViabilidadeDeRecursoExtraordinarioComContrarrazoes,
    padraoViabilidadeDeRecursoExtraordinarioComEmbargosDeDeclaracao,
    padraoViabilidadeDeRecursoEspecial,
    padraoViabilidadeDeRecursoExtraordinario,
]

export const padraoAgravoInterno = [
    ANY(),
    ANY({
        capture: [T.RELATORIO, T.VOTO], greedy: true, except: pecasQueFinalizamFases
    }),
    PHASE(FaseProcessual.AGRAVO_INTERNO.name),
    EXACT(T.ACORDAO),
    ANY({
        greedy: false, except: pecasQueFinalizamFases
    }),
    EXACT(T.AGRAVO_INTERNO),
    ANY({
        capture: [T.CONTRARRAZOES_AO_RECURSO_ESPECIAL], greedy: true, except: pecasQueFinalizamFases
    }),
]

export const padraoAgravoAberta = [
    ALT([
        ANY({ capture: [T.PETICAO_INICIAL, ...pecasRelevantesDaFaseDeConhecimentoPara2aInstancia], greedy: true }),
        EXACT(T.DESPACHO_DECISAO),
        ANY(),
    ], [
        ANY(),
    ]),
    PHASE(FaseProcessual.AGRAVO.name),
    OR(...pecasQueRepresentamAgravoPara2aInstancia),
    ANY({
        capture: pecasRelevantes2aInstanciaRecursos, greedy: true, except: pecasQueFinalizamFases
    })
]

export const padraoAgravoFechada = [
    ...padraoAgravoAberta,
    PHASE(FaseProcessual.AGRAVO_CONCLUIDA.name),
    EXACT(T.ACORDAO),
    ANY({ except: pecasQueIniciamFases })
]

export const padroesAgravo = [
    padraoAgravoFechada,
    padraoAgravoAberta,
]

export const padraoAgravoForcado = [
    ...padraoAgravoAberta,
    PHASE(FaseProcessual.CONHECIMENTO_CONCLUIDA.name),
    EXACT(T.ACORDAO),
    ANY(),
]

export const padraoAgravoSemConhecimento = [
    ANY(),
    PHASE(FaseProcessual.AGRAVO.name),
    OR(...pecasQueRepresentamAgravoPara2aInstancia),
    ANY({
        capture: pecasRelevantes2aInstanciaRecursos, greedy: true, except: pecasQueFinalizamFases
    }),
]

export const padraoAgravoForcadoSemConhecimento = [
    ...padraoAgravoSemConhecimento,
    PHASE(FaseProcessual.AGRAVO_CONCLUIDA.name),
    EXACT(T.ACORDAO),
    ANY(),
]

export const padraoApelacaoAberta = [
    ANY({ capture: [T.PETICAO_INICIAL, ...pecasRelevantesDaFaseDeConhecimentoPara2aInstancia] }),
    EXACT(T.SENTENCA),
    ANY(),
    PHASE(FaseProcessual.APELACAO.name),
    OR(...pecasQueRepresentamRecursoPara2aInstancia),
    ANY({
        capture: pecasRelevantes2aInstanciaRecursos, greedy: true, except: pecasQueFinalizamFases
    })
]

export const padraoApelacaoFechada = [
    ...padraoApelacaoAberta,
    PHASE(FaseProcessual.APELACAO_CONCLUIDA.name),
    EXACT(T.ACORDAO),
    ANY({ except: pecasQueIniciamFases })
]

export const padroesApelacao = [
    padraoApelacaoFechada,
    padraoApelacaoAberta,
]

export const padraoApelacaoForcado = [
    ...padraoApelacaoAberta,
    PHASE(FaseProcessual.CONHECIMENTO_CONCLUIDA.name),
    EXACT(T.ACORDAO),
    ANY(),
]


export const padraoTurmaRecursalAberta = [
    ANY({ capture: [...pecasRelevantesDaFaseDeConhecimentoPara2aInstancia] }),
    EXACT(T.PETICAO_INICIAL),
    ANY({ capture: [...pecasRelevantesDaFaseDeConhecimentoPara2aInstancia] }),
    EXACT(T.SENTENCA),
    PHASE(FaseProcessual.TURMA_RECURSAL.name),
    OR(...pecasQueIniciamFaseDeTurmaRecursal),
    ANY({
        capture: pecasRelevantes2aInstanciaRecursos, greedy: true, except: pecasQueFinalizamFaseDeTurmaRecursal
    })
]

export const padraoTurmaRecursalFechada = [
    ...padraoTurmaRecursalAberta,
    PHASE(FaseProcessual.TURMA_RECURSAL_CONCLUIDA.name),
    EXACT(T.ACORDAO),
    ANY({ except: pecasQueIniciamFases })
]

export const padroesTurmaRecursal = [
    padraoTurmaRecursalFechada,
    padraoTurmaRecursalAberta,
]

export const padraoDespachoInicial = [
    ANY({ capture: [...pecasRelevantes1aInstancia] }),
    EXACT(T.PETICAO_INICIAL),
    PHASE(FaseProcessual.DESPACHO_INICIAL.name),
    ANY({ capture: [...pecasRelevantes1aInstancia], except: pecasQueIniciamFases }),
]

export const padraoConhecimentoAberta = [
    ...padraoDespachoInicial,
    EXACT(T.DESPACHO_DECISAO),
    PHASE(FaseProcessual.CONHECIMENTO.name),
    ANY({ capture: [...pecasRelevantes1aInstancia], except: pecasQueIniciamFases }),
]

export const padraoConhecimentoFechada = [
    ...padraoConhecimentoAberta,
    PHASE(FaseProcessual.CONHECIMENTO_CONCLUIDA.name),
    EXACT(T.SENTENCA),
    ANY({ except: pecasQueIniciamFases })
]

export const padraoConhecimentoForcado = [
    ...padraoConhecimentoAberta,
    PHASE(FaseProcessual.CONHECIMENTO_CONCLUIDA.name),
    EXACT(T.SENTENCA),
    ANY(),
]

export const padroesConhecimento = [
    padraoConhecimentoFechada,
    padraoConhecimentoAberta,
    padraoDespachoInicial,
]

const padroesBasicosSegundaInstancia = [
    padraoEmbargosDeDeclaracaoEmAcordao,
    ...padroesApelacao,
    ...padroesAgravo,
]

const padroesMinimosSegundaInstancia = [
    ...padroesBasicosSegundaInstancia,
    ...padroesConhecimento,
]

// Ordem de prioridade: padrões mais específicos/raros primeiro.
// Viabilidade de Recursos Extraordinário/Especial tem prioridade máxima
// (são os casos mais raros e específicos), seguida de Embargos de Declaração
// em Acórdão, depois Apelação/Agravo, Turma Recursal, Conhecimento e, por
// último, os padrões forçados (fallbacks).
//
// Observação: `selecionarPecasPorPadraoComFase` retorna no PRIMEIRO match
// (`break` no loop), então a posição no array = prioridade de detecção.
export const padroesPorPrioridade = [
    ...padroesViabilidadeDeRecursosExtraordinarioEEspecial,
    ...padroesBasicosSegundaInstancia,
    ...padroesTurmaRecursal,
    ...padroesConhecimento,
]

// Mesma ordem de prioridade, mas inclui os padrões "forçados" como fallback
// no final (só serão tentados se nenhum padrão natural casar).
export const padroesPorPrioridadeComFallback = [
    ...padroesPorPrioridade,
    padraoAgravoForcado,
    padraoApelacaoForcado,
    padraoConhecimentoForcado,
]

// Padrões para suspensão por IRDR / Recursos Repetitivos / Repercussão Geral
const eventoCriteriaSuspensao: EventMatch = { id: [265, 11975, 12098, 12099, 12100] }

// Preferência: peça vinculada ao evento de suspensão (documento do mesmo evento)
const padraoSuspensaoDecisaoVinculada2Pecas = [
    ANY(),
    OR(T.DESPACHO_DECISAO, T.SENTENCA),
    ANY(),
    EVENT(eventoCriteriaSuspensao),
    OR(T.DESPACHO_DECISAO, T.SENTENCA),
    ANY(),
]

const padraoSuspensaoDecisaoVinculada = [
    ANY(),
    EVENT(eventoCriteriaSuspensao),
    OR(T.DESPACHO_DECISAO, T.SENTENCA),
    ANY(),
]

// Fallback: peça encontrada antes do evento de suspensão
const padraoSuspensaoDecisaoAnterior2Pecas = [
    ANY({ greedy: true }),
    OR(T.DESPACHO_DECISAO, T.SENTENCA),
    ANY(),
    OR(T.DESPACHO_DECISAO, T.SENTENCA),
    ANY(),
    EVENT(eventoCriteriaSuspensao),
    ANY(),
]

const padraoSuspensaoDecisaoAnterior = [
    ANY({ greedy: true }),
    OR(T.DESPACHO_DECISAO, T.SENTENCA),
    ANY(),
    EVENT(eventoCriteriaSuspensao),
    ANY(),
]

export const padroesSuspensao = [
    padraoSuspensaoDecisaoVinculada2Pecas,
    padraoSuspensaoDecisaoVinculada,
    padraoSuspensaoDecisaoAnterior2Pecas,
    padraoSuspensaoDecisaoAnterior,
]

/**
 * Detecta a fase processual atual de um processo com base nas peças e movimentos.
 * Usa um "super pattern" que combina todos os padrões existentes para identificar
 * em qual fase o processo se encontra.
 * 
 * @param pecas - Array de peças do processo
 * @param movimentosEDocumentos - Array opcional de movimentos e documentos do processo
 * @returns Objeto com faseAtual (string) e fases (array de strings) detectadas
 */
export const detectarFaseDoProcesso = (
    pecas: PecaType[],
    movimentosEDocumentos?: InteropMovimentoComDocumentosType[]
): { faseAtual?: string; fases?: string[] } => {
    // Usa o super pattern que combina todos os padrões por ordem de prioridade,
    // incluindo os forçados como fallback.
    const superPattern = padroesPorPrioridadeComFallback

    const resultado = selecionarPecasPorPadraoComFase(pecas, superPattern, movimentosEDocumentos)

    return {
        faseAtual: resultado.faseAtual,
        fases: resultado.fases
    }
}

export interface TipoDeSinteseValido {
    id: number,
    nome: string,
    sort?: number,
    padroes?: MatchOperator[][],
    share: string,
    batchReport?: boolean,
}

const PieceStrategyArray = [
    { id: 1, name: 'MAIS_RELEVANTES', descr: 'Peças mais relevantes', pattern: padroesPorPrioridadeComFallback },
    { id: 1, name: 'MAIS_RELEVANTES_PRIMEIRA_INSTANCIA', descr: 'Peças mais relevantes para 1ª Instância', pattern: [...padroesConhecimento, padraoConhecimentoForcado] },
    { id: 1, name: 'MAIS_RELEVANTES_SEGUNDA_INSTANCIA', descr: 'Peças mais relevantes para 2ª Instância', pattern: [...padroesBasicosSegundaInstancia, padraoApelacaoForcado] },
    { id: 1, name: 'APELACAO_E_TRIAGEM', descr: 'Triagem de Apelação ou Agravo', pattern: [...padroesBasicosSegundaInstancia, padraoAgravoForcado, padraoApelacaoForcado, padraoAgravoSemConhecimento, padraoAgravoForcadoSemConhecimento] },
    { id: 1, name: 'CONHECIMENTO', descr: 'Fase de conhecimento', pattern: padroesConhecimento },
    { id: 1, name: 'VIABILIDADE_RECURSO_EXTRAORDINARIO', descr: 'Viabilidade de recurso extraordinário', pattern: padroesViabilidadeDeRecursoExtraordinario },
    { id: 1, name: 'VIABILIDADE_RECURSO_ESPECIAL', descr: 'Viabilidade de recurso especial', pattern: padroesViabilidadeDeRecursoEspecial },
    { id: 2, name: 'PETICAO_INICIAL', descr: 'Petição inicial', pattern: [[ANY(), EXACT(T.PETICAO_INICIAL), ANY()]] },
    { id: 2, name: 'PETICAO_INICIAL_E_ANEXOS', descr: 'Petição inicial e anexos', pattern: [[ANY(), EXACT(T.PETICAO_INICIAL, true), ANY()]] },
    { id: 2, name: 'PPP', descr: 'Perfil Profissiográfico Previdenciário', pattern: [[ANY({ capture: [T.PERFIL_PROFISSIOGRAFICO_PREVIDENCIARIO], greedy: true })]] },
    { id: 3, name: 'TIPOS_ESPECIFICOS', descr: 'Peças de tipos específicos', pattern: undefined },
    { id: 3, name: 'TODAS', descr: 'Todas', pattern: [[ANY({ capture: [] })]] },
    { id: 2, name: 'SUSPENSAO', descr: 'Decisão de suspensão por IRDR/Repetitivos/Repercussão Geral', pattern: padroesSuspensao },
]
export type PieceStrategyValueType = EnumOfObjectsValueType & { descr: string, pattern: MatchOperator[][] | undefined }
export type PieceStrategyType = { [key: string]: PieceStrategyValueType }
export const PieceStrategy: PieceStrategyType = PieceStrategyArray.reduce((acc, cur, idx) => {
    acc[slugify(cur.name).replaceAll('-', '_').toUpperCase()] = { ...cur, sort: idx + 1 }
    return acc
}, {} as PieceStrategyType)

export type PieceDescrValueType = EnumOfObjectsValueType & { descr: string }
export type PieceDescrType = { [key: string]: PieceDescrValueType }
export const PieceDescr: PieceDescrType = Object.keys(T).filter(x => x !== 'TEXTO').reduce((acc, cur, idx) => {
    acc[cur] = { id: idx + 1, name: cur, descr: maiusculasEMinusculas(T[cur]), sort: idx + 1 }
    return acc
}, {} as PieceDescrType)


export interface SelecionarPecasResultado {
    pecas: PecaType[] | null
    faseAtual?: string
    fases?: string[]
}

export const selecionarPecasPorPadraoComFase = (pecas: PecaType[], padroes: MatchOperator[][], movimentosEDocumentos?: InteropMovimentoComDocumentosType[]): SelecionarPecasResultado => {
    let ps: Documento[] = pecas.map(p => ({ id: p.id, tipo: p.descr as T, numeroDoEvento: p.numeroDoEvento, descricaoDoEvento: p.descricaoDoEvento }))

    // Cria um índice de peças por id
    const indexById = {}
    for (let i = 0; i < ps.length; i++) {
        indexById[ps[i].id] = i
    }

    // Constrói a sequência de items (documentos intercalados com eventos) quando movimentosEDocumentos está disponível
    let sequence: SequenceItem[]
    if (movimentosEDocumentos?.length) {
        sequence = []
        const docMap = new Map<string, Documento>()
        for (const d of ps) docMap.set(d.id, d)
        for (const mov of movimentosEDocumentos) {
            const evento: Evento = {
                kind: 'evento',
                sequencia: mov.sequencia,
                descricao: mov.descricao,
                tipoNome: mov.tipo?.nome,
                id: mov.tipo?.id,
            }
            sequence.push(evento)
            for (const docRef of mov.documentos) {
                const doc = docMap.get(docRef.id)
                if (doc) sequence.push(doc)
            }
        }
    } else {
        sequence = ps
    }

    // Cria um índice de matches possíveis
    const matches: MatchFullResult[] = []
    for (const padrao of padroes) {
        const m = matchFull(sequence, padrao)
        if (m !== null && m.items.length > 0) {
            matches.push(m)
            break
        }
    }
    if (matches.length === 0) return { pecas: null }

    // Seleciona o match cuja última peça em uma operação de EXACT ou OR é a mais recente
    let matchSelecionado: MatchFullResult | null = null
    let idxUltimaPecaRelevanteDoMatchSelecionado = -1
    for (const m of matches) {
        // Encontra a última operação do tipo EXACT ou OR com peças capturadas
        let idx = m.items.length - 1
        while (idx >= 0 && !((m.items[idx].operator.type === 'ANY' || m.items[idx].operator.type === 'SOME') && m.items[idx].captured.length)) idx--
        if (idx < 0) continue

        // Encontra a última peça capturada
        const ultimaPecaRelevante = m.items[idx].captured[m.items[idx].captured.length - 1]
        const idxUltimaPecaRelevante = indexById[ultimaPecaRelevante.id]
        if (idxUltimaPecaRelevante > idxUltimaPecaRelevanteDoMatchSelecionado) {
            matchSelecionado = m
            idxUltimaPecaRelevanteDoMatchSelecionado = idxUltimaPecaRelevante
        }
    }

    // Se não encontrou, seleciona o match cuja última peça é a mais recente
    if (matchSelecionado === null) {
        for (const m of matches) {
            // Encontra a última operação do tipo EXACT ou OR
            let idx = m.items.length - 1
            while (idx >= 0 && m.items[idx].captured.length === 0) idx--
            if (idx < 0) continue

            // Encontra a última peça capturada
            const ultimaPecaRelevante = m.items[idx].captured[m.items[idx].captured.length - 1]
            const idxUltimaPecaRelevante = indexById[ultimaPecaRelevante.id]
            if (idxUltimaPecaRelevante > idxUltimaPecaRelevanteDoMatchSelecionado) {
                matchSelecionado = m
                idxUltimaPecaRelevanteDoMatchSelecionado = idxUltimaPecaRelevante
            }
        }
    }

    if (matchSelecionado === null) return { pecas: null }

    // Flattern the match and map back to PecaType
    const pecasSelecionadas = matchSelecionado.items.map(m => m.captured).flat().map(d => pecas[indexById[d.id]])

    if (pecasSelecionadas.length === 0) return { pecas: null }

    const pecasComAnexos = acrescentarAnexosDoPJe(pecas, pecasSelecionadas, indexById)
    const faseAtual = matchSelecionado.lastPhase?.phase
    const fases = matchSelecionado.phasesMatched.map(p => p.phase)
    return { pecas: pecasComAnexos, faseAtual, fases }
}

const isPJeOriginId = (idOriginal: string | undefined | null): boolean => {
    if (!idOriginal) {
        return true; // No idOriginal, assume not PJe for this rule.
    }
    if (!/^\d+$/.test(idOriginal)) {
        return true; // Not a string of digits, assume not PJe.
    }
    // It's a string of digits. If its length is less than typical PJe ID length, assume not PJe.
    return idOriginal.length < PJE_ID_MAX_LENGTH
}

// Incluir a peça seguinte para resolver um problema que afeta o PJe. O critério deve ser o seguinte:
// A peça deve ser do tipo HTML
// Deve haver um PDF logo em seguida, e no mesmo evento
// O idOriginal da peça não deve ser um número muito grande (não é uma peça do PJe)
const acrescentarAnexosDoPJe = (pecas: PecaType[], pecasSelecionadas: PecaType[], indexById: any) => {
    // Use a Set to keep track of IDs in pecasSelecionadas for efficient lookup and to manage additions.
    const allSelectedPecaIds = new Set(pecasSelecionadas.map(p => p.id))
    const newlyAddedPecas: PecaType[] = []

    // Iterate through the original `pecas` array to find pairs of (selected HTML, next PDF)
    for (let i = 0; i < pecas.length - 2; i++) {
        const currentPeca = pecas[i]
        const nextPeca = pecas[i + 1]

        // Check if currentPeca is one of the selected pieces (either original or newly added)
        if (allSelectedPecaIds.has(currentPeca.id)) {
            // Condition 1: The selected piece is HTML
            if (currentPeca.tipoDoConteudo === 'text/html') {
                // Condition 2: The idOriginal of the HTML piece indicates it's not from PJe
                if (isPJeOriginId(currentPeca.idOrigem)) {
                    // Condition 3: The next piece is a PDF
                    // Condition 4: The next piece is in the same event
                    if (nextPeca.tipoDoConteudo === 'application/pdf' &&
                        nextPeca.numeroDoEvento === currentPeca.numeroDoEvento) {
                        // Condition 5: The next piece is not already in the selected set
                        if (!allSelectedPecaIds.has(nextPeca.id)) {
                            newlyAddedPecas.push(nextPeca);
                        }
                    }
                }
            }
        }
    }

    if (newlyAddedPecas.length > 0) {
        // Add the newly identified pieces to the original list
        pecasSelecionadas = [...pecasSelecionadas, ...newlyAddedPecas]

        // Sort the combined list based on their original order in the `pecas` array
        // using the precomputed indexById map.
        pecasSelecionadas.sort((a, b) => {
            const indexA = indexById[a.id]
            const indexB = indexById[b.id]

            // This check is defensive; IDs should always be in indexById if from `pecas`.
            if (indexA === undefined && indexB === undefined) return 0
            if (indexA === undefined) return 1 // Put undefined ones at the end
            if (indexB === undefined) return -1 // Put undefined ones at the end

            return indexA - indexB;
        })
    }

    return pecasSelecionadas
}

const PJE_ID_MAX_LENGTH = 12 // Typical PJe IDs are 19 digits. Shorter or non-numeric are considered "not PJe".

