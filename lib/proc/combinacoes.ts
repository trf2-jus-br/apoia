import { EnumOfObjectsValueType } from "../ai/model-types"
import { maiusculasEMinusculas, slugify } from "../utils/utils"
import { ANY, Documento, EXACT, matchFull, MatchOperator, MatchFullResult, OR, SOME, PHASE } from "./pattern"
import { PecaType, StatusDeLancamento } from "./process-types"

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
    SENTENCA = 'SENTENÇA',
    EMBARGOS_DE_DECLARACAO = 'EMBARGOS DE DECLARAÇÃO',
    APELACAO = 'APELAÇÃO',
    CONTRARRAZOES_AO_RECURSO_DE_APELACAO = 'CONTRARRAZÕES AO RECURSO DE APELAÇÃO',
    AGRAVO = 'AGRAVO',
    AGRAVO_INTERNO = 'AGRAVO INTERNO',
    RECURSO = 'RECURSO',
    RECURSO_INOMINADO = 'RECURSO INOMINADO',
    CONTRARRAZOES = 'CONTRARRAZÕES',
    RELATORIO = 'RELATÓRIO',
    EXTRATO_DE_ATA = 'EXTRATO DE ATA',
    VOTO = 'VOTO',
    ACORDAO = 'ACÓRDÃO',
    FORMULARIO = 'FORMULÁRIO',
    PARECER = 'PARECER',
    ATESTADO_DE_PERMANENCIA = 'ATESTADO DE PERMANÊNCIA',
}

export enum P {
    RESUMOS = 'Resumos',
    RESUMO_PECA = 'Resumo de Peça',
    ANALISE = 'Análise',
    ANALISE_TR = 'Análise para Turma Recursal',
    ANALISE_COMPLETA = 'Análise Completa',
    RESUMO = 'Resumo',
    RELATORIO = 'Relatório',
    EMENTA = 'Ementa',
    ACORDAO = 'Acórdão',
    REVISAO = 'Revisão',
    REFINAMENTO = 'Refinamento',
    PEDIDOS = 'Pedidos',
    PEDIDOS_FUNDAMENTACOES_E_DISPOSITIVOS = 'Pedidos, Fundamentações e Dispositivos',
    INDICE = 'Índice',
    LITIGANCIA_PREDATORIA = 'Litigância Predatória',
    CHAT = 'Chat',
    RELATORIO_DE_PROCESSO_COLETIVO_OU_CRIMINAL = 'Relatório de Processo Coletivo ou Criminal',
    MINUTA_DE_DESPACHO_DE_ACORDO_9_DIAS = 'Minuta de Despacho de Acordo 9 dias',
    PREV_PPP = 'Perfil Profissiográfico Previdenciário - PPP',
    PREV_APESP_PONTOS_CONTROVERTIDOS_PRIMEIRA_INSTANCIA = 'Relatório de Aposentadoria Especial - Primeira Instância',
    PREV_APESP_PONTOS_CONTROVERTIDOS_SEGUNDA_INSTANCIA = 'Relatório de Aposentadoria Especial - Segunda Instância',
    PREV_APESP_PONTOS_CONTROVERTIDOS_SEGUNDA_INSTANCIA_COM_PPP = 'Relatório de Aposentadoria Especial - Segunda Instância (com PPP)',
    PREV_BI_ANALISE_DE_LAUDO = 'Análise de Laudo Pericial BI',
    PREV_BI_SENTENCA_LAUDO_FAVORAVEL = 'Sentença BI (Laudo Favorável)',
    PREV_BI_SENTENCA_LAUDO_DESFAVORAVEL = 'Sentença BI (Laudo Desfavorável)',
}

export enum Plugin {
    TRIAGEM = 'Triagem',
    NORMAS = 'Normas',
    PALAVRAS_CHAVE = 'Palavras-Chave',
    TRIAGEM_JSON = 'Triagem JSON',
    NORMAS_JSON = 'Normas JSON',
    PALAVRAS_CHAVE_JSON = 'Palavras-Chave JSON',
}

export interface ProdutoValido { titulo: string, prompt: string, plugins: Plugin[] }

export const ProdutosValidos = {
    [P.RESUMO_PECA]: { titulo: P.RESUMO_PECA, prompt: 'resumo_peca', plugins: [] },
    [P.RESUMOS]: { titulo: P.RESUMOS, prompt: 'resumos', plugins: [] },
    [P.ANALISE_TR]: { titulo: P.ANALISE_TR, prompt: 'analise-tr', plugins: [Plugin.TRIAGEM, Plugin.NORMAS, Plugin.PALAVRAS_CHAVE] },
    [P.ANALISE]: { titulo: P.ANALISE, prompt: 'analise', plugins: [] },
    [P.ANALISE_COMPLETA]: { titulo: P.ANALISE_COMPLETA, prompt: 'analise-completa', plugins: [] },
    [P.RELATORIO]: { titulo: P.RELATORIO, prompt: 'relatorio', plugins: [] },
    [P.RESUMO]: { titulo: P.RESUMO, prompt: 'resumo', plugins: [Plugin.TRIAGEM, Plugin.NORMAS, Plugin.PALAVRAS_CHAVE] },
    [P.ACORDAO]: { titulo: P.ACORDAO, prompt: 'acordao', plugins: [] },
    [P.REVISAO]: { titulo: P.REVISAO, prompt: 'revisao', plugins: [] },
    [P.REFINAMENTO]: { titulo: P.REFINAMENTO, prompt: 'refinamento', plugins: [] },
    [P.PEDIDOS]: { titulo: P.PEDIDOS, prompt: 'pedidos-de-peticao-inicial', plugins: [] },
    [P.PEDIDOS_FUNDAMENTACOES_E_DISPOSITIVOS]: { titulo: P.PEDIDOS_FUNDAMENTACOES_E_DISPOSITIVOS, prompt: 'pedidos-fundamentacoes-e-dispositivos', plugins: [] },
    [P.INDICE]: { titulo: P.INDICE, prompt: 'indice', plugins: [] },
    [P.LITIGANCIA_PREDATORIA]: { titulo: P.LITIGANCIA_PREDATORIA, prompt: 'litigancia-predatoria', plugins: [] },
    [P.CHAT]: { titulo: P.CHAT, prompt: 'chat', plugins: [] },
    [P.RELATORIO_DE_PROCESSO_COLETIVO_OU_CRIMINAL]: { titulo: P.RELATORIO_DE_PROCESSO_COLETIVO_OU_CRIMINAL, prompt: 'relatorio-de-processo-coletivo-ou-criminal', plugins: [Plugin.TRIAGEM, Plugin.NORMAS, Plugin.PALAVRAS_CHAVE] },
    [P.MINUTA_DE_DESPACHO_DE_ACORDO_9_DIAS]: { titulo: P.MINUTA_DE_DESPACHO_DE_ACORDO_9_DIAS, prompt: 'minuta-de-despacho-de-acordo-9-dias', plugins: [] },
    [P.PREV_PPP]: { titulo: P.PREV_PPP, prompt: 'prev-ppp', plugins: [] },
    [P.PREV_APESP_PONTOS_CONTROVERTIDOS_PRIMEIRA_INSTANCIA]: { titulo: P.PREV_APESP_PONTOS_CONTROVERTIDOS_PRIMEIRA_INSTANCIA, prompt: 'prev-apesp-pontos-controvertidos-primeira-instancia', plugins: [] },
    [P.PREV_APESP_PONTOS_CONTROVERTIDOS_SEGUNDA_INSTANCIA]: { titulo: P.PREV_APESP_PONTOS_CONTROVERTIDOS_SEGUNDA_INSTANCIA, prompt: 'prev-apesp-pontos-controvertidos-segunda-instancia', plugins: [] },
    [P.PREV_APESP_PONTOS_CONTROVERTIDOS_SEGUNDA_INSTANCIA_COM_PPP]: { titulo: P.PREV_APESP_PONTOS_CONTROVERTIDOS_SEGUNDA_INSTANCIA_COM_PPP, prompt: 'prev-apesp-pontos-controvertidos-segunda-instancia-com-ppp', plugins: [] },
    [P.PREV_BI_ANALISE_DE_LAUDO]: { titulo: P.PREV_BI_ANALISE_DE_LAUDO, prompt: 'prev-bi-analise-de-laudo', plugins: [] },
    [P.PREV_BI_SENTENCA_LAUDO_FAVORAVEL]: { titulo: P.PREV_BI_SENTENCA_LAUDO_FAVORAVEL, prompt: 'prev-bi-sentenca-laudo-favoravel', plugins: [] },
    [P.PREV_BI_SENTENCA_LAUDO_DESFAVORAVEL]: { titulo: P.PREV_BI_SENTENCA_LAUDO_DESFAVORAVEL, prompt: 'prev-bi-sentenca-laudo-desfavoravel', plugins: [] },
}

export interface ProdutoCompleto { produto: P, dados: T[] }

export const PC = (p: P, d?: T | T[]): ProdutoCompleto => {
    if (Array.isArray(d)) return { produto: p, dados: d }
    return { produto: p, dados: d ? [d as T] : [] }
}

export type TipoDeSinteseType = {
    nome: string,
    // tipos: T[][],
    padroes: MatchOperator[][],
    produtos: (P | ProdutoCompleto)[],
    sort: number,
    status: StatusDeLancamento,
}

const pecasQueRepresentamContestacao = [
    T.CONTESTACAO,
    T.INFORMACAO_EM_MANDADO_DE_SEGURANCA,
    T.DEFESA_PREVIA_DEFESA_PRELIMINAR_RESPOSTA_DO_REU,
]

const pecasRelevantes1aInstancia = [
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

const pecasQueFinalizamFases = [
    ...pecasQueFinalizamFaseDeConhecimento,
    ...pecasQueFinalizamFaseDeTurmaRecursal,
    ...pecasQueFinalizamFaseDeRecursoDe2aInstancia
]

const pecasQueRepresentamRecursoPara2aInstancia = [
    T.APELACAO,
    T.RECURSO,
    T.AGRAVO,
    T.AGRAVO_INTERNO,
    T.EMBARGOS_DE_DECLARACAO,
]

const pecasRelevantes2aInstanciaContrarrazoes = [
    T.CONTRARRAZOES,
    T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO
]

const pecasRelevantes2aInstanciaRecursos = [
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

export const padraoApelacaoAberta = [
    ANY({ capture: [T.PETICAO_INICIAL, ...pecasRelevantesDaFaseDeConhecimentoPara2aInstancia] }),
    EXACT(T.SENTENCA),
    ANY(),
    PHASE('Apelação Aberta'),
    OR(...pecasQueRepresentamRecursoPara2aInstancia),
    ANY({
        capture: pecasRelevantes2aInstanciaRecursos, greedy: true, except: pecasQueFinalizamFases
    })
]

export const padraoApelacaoFechada = [
    ...padraoApelacaoAberta,
    PHASE('Apelação Fechada'),
    EXACT(T.ACORDAO),
    ANY({ except: pecasQueIniciamFases })
]

export const padroesApelacao = [
    padraoApelacaoFechada,
    padraoApelacaoAberta,
]

export const padraoApelacaoForcado = [
    ...padraoApelacaoAberta,
    PHASE('Conhecimento Fechada'),
    EXACT(T.ACORDAO),
    ANY(),
]    


export const padraoTurmaRecursalAberta = [
    ANY({ capture: [...pecasRelevantesDaFaseDeConhecimentoPara2aInstancia] }),
    EXACT(T.PETICAO_INICIAL),
    ANY({ capture: [...pecasRelevantesDaFaseDeConhecimentoPara2aInstancia] }),
    EXACT(T.SENTENCA),
    PHASE('Turma Recursal Aberta'),
    OR(...pecasQueIniciamFaseDeTurmaRecursal),
    ANY({
        capture: pecasRelevantes2aInstanciaRecursos, greedy: true, except: pecasQueFinalizamFaseDeTurmaRecursal
    })    
]    

export const padraoTurmaRecursalFechada = [
    ...padraoTurmaRecursalAberta,
    PHASE('Turma Recursal Fechada'),
    EXACT(T.ACORDAO),
    ANY({ except: pecasQueIniciamFases })
]    

export const padroesTurmaRecursal = [
    padraoTurmaRecursalFechada,
    padraoTurmaRecursalAberta,
]

export const padraoConhecimentoAberta = [
    ANY({ capture: [...pecasRelevantes1aInstancia] }),
    PHASE('Conhecimento Aberta'),
    EXACT(T.PETICAO_INICIAL),
    ANY({ capture: [...pecasRelevantes1aInstancia], except: pecasQueIniciamFases}),
]    

export const padraoConhecimentoFechada = [
    ...padraoConhecimentoAberta,
    PHASE('Conhecimento Fechada'),
    EXACT(T.SENTENCA),
    ANY({ except: pecasQueIniciamFases })
]    

export const padraoConhecimentoForcado = [
    ...padraoConhecimentoAberta,
    PHASE('Conhecimento Fechada'),
    EXACT(T.SENTENCA),
    PHASE('Conhecimento Fechada'),
    ANY(),
]    

export const padroesConhecimento = [
    padraoConhecimentoFechada,
    padraoConhecimentoAberta,
]

const padroesBasicosSegundaInstancia = [
    ...padroesApelacao,
]

const padroesMinimosSegundaInstancia = [
    ...padroesBasicosSegundaInstancia,
    ...padroesConhecimento,
]

const padroesBasicos = [
    ...padroesBasicosSegundaInstancia,
    ...padroesTurmaRecursal,
    ...padroesConhecimento
]

// "inicial contestação sentença, embargos de declaração, sentença, apelação, contrarrazoes de apelação"
// "agravo, contrarrazoes de agravo"
export const TipoDeSinteseMap: Record<string, TipoDeSinteseType> = {
    RESUMOS_TRIAGEM: {
        status: StatusDeLancamento.PUBLICO,
        sort: 1,
        nome: 'Resumos e triagem',
        padroes: padroesBasicos,
        produtos: [P.RESUMOS, P.RESUMO, P.CHAT]
    },
    RESUMOS_ANALISE: {
        status: StatusDeLancamento.PUBLICO,
        sort: 2,
        nome: 'Resumos e análise',
        padroes: padroesBasicos,
        produtos: [P.RESUMOS, P.ANALISE, P.CHAT]
    },
    PEDIDOS_FUNDAMENTACOES_E_DISPOSITIVOS: {
        status: StatusDeLancamento.PUBLICO,
        sort: 3,
        nome: 'Minuta de Sentença',
        padroes: [...padroesConhecimento, padraoConhecimentoForcado],
        produtos: [P.RESUMOS, P.PEDIDOS_FUNDAMENTACOES_E_DISPOSITIVOS, P.CHAT]
    },
    RESUMOS: {
        status: StatusDeLancamento.PUBLICO,
        sort: 4,
        nome: 'Resumos das principais peças',
        padroes: padroesBasicos,
        // tipos: [
        //     [T.PETICAO_INICIAL],
        // ],
        produtos: [P.RESUMOS, P.CHAT]
    },
    LITIGANCIA_PREDATORIA: {
        status: StatusDeLancamento.EM_DESENVOLVIMENTO,
        sort: 5,
        nome: 'Litigância Predatória',
        padroes: [
            [ANY(), EXACT(T.PETICAO_INICIAL, true), ANY()],
        ],
        produtos: [PC(P.RESUMOS, [T.PETICAO_INICIAL]), P.LITIGANCIA_PREDATORIA, P.CHAT]
    },
    PEDIDOS: {
        status: StatusDeLancamento.EM_DESENVOLVIMENTO,
        sort: 6,
        nome: 'Pedidos',
        padroes: [
            [ANY(), EXACT(T.PETICAO_INICIAL), ANY()],
        ],
        produtos: [P.RESUMOS, P.PEDIDOS, P.CHAT]
    },
    CHAT: {
        status: StatusDeLancamento.PUBLICO,
        sort: 7,
        nome: 'Chat',
        padroes: [
            [ANY({ capture: [] })],
        ],
        // tipos: [
        //     [T.PETICAO_INICIAL],
        // ],
        produtos: [P.CHAT]
    },

    INDICE: {
        status: StatusDeLancamento.EM_DESENVOLVIMENTO,
        sort: 8,
        nome: 'Índice',
        padroes: [
            [ANY({ capture: [] })],
        ],
        // tipos: [
        //     [T.PETICAO_INICIAL],
        // ],
        produtos: [P.INDICE, P.CHAT]
    },

    RELATORIO_DE_PROCESSO_COLETIVO_OU_CRIMINAL: {
        status: StatusDeLancamento.PUBLICO,
        sort: 9,
        nome: 'Relatório de Processo Coletivo ou Criminal',
        padroes: [
            [ANY({ capture: [] })],
        ],
        produtos: [P.RELATORIO_DE_PROCESSO_COLETIVO_OU_CRIMINAL, P.CHAT]
    },

    MINUTA_DE_DESPACHO_DE_ACORDO_9_DIAS: {
        status: StatusDeLancamento.EM_DESENVOLVIMENTO,
        sort: 10,
        nome: 'Minuta de Despacho de Acordo 9 dias',
        padroes: [
            [ANY(), EXACT(T.PETICAO_INICIAL), ANY({ capture: [T.FORMULARIO] })],
        ],
        produtos: [P.MINUTA_DE_DESPACHO_DE_ACORDO_9_DIAS, P.CHAT]
    },

    RELATORIO_DE_ACERVO: {
        status: StatusDeLancamento.EM_DESENVOLVIMENTO,
        sort: 1000,
        nome: 'Relatório de Acervo',
        padroes: padroesBasicos,
        produtos: [P.RESUMOS, P.RESUMO]
    },

    PREV_PPP: {
        status: StatusDeLancamento.EM_DESENVOLVIMENTO,
        sort: 1000,
        nome: 'Perfil Profissiográfico Previdenciário - PPP',
        padroes: [[ANY({ capture: [T.PERFIL_PROFISSIOGRAFICO_PREVIDENCIARIO], greedy: true })]],
        produtos: [P.PREV_PPP, P.CHAT]
    },

    PREV_APESP_PONTOS_CONTROVERTIDOS_PRIMEIRA_INSTANCIA: {
        status: StatusDeLancamento.PUBLICO,
        sort: 1000,
        nome: 'Relatório de Aposentadoria Especial - Primeira Instância',
        padroes: [...padroesConhecimento, padraoConhecimentoForcado],
        produtos: [P.PREV_APESP_PONTOS_CONTROVERTIDOS_PRIMEIRA_INSTANCIA, P.CHAT]
    },

    PREV_APESP_PONTOS_CONTROVERTIDOS_SEGUNDA_INSTANCIA: {
        status: StatusDeLancamento.PUBLICO,
        sort: 1000,
        nome: 'Relatório de Aposentadoria Especial - Segunda Instância',
        padroes: [...padroesBasicosSegundaInstancia, padraoApelacaoForcado],
        produtos: [P.PREV_APESP_PONTOS_CONTROVERTIDOS_SEGUNDA_INSTANCIA, P.CHAT]
    },

    PREV_APESP_PONTOS_CONTROVERTIDOS_SEGUNDA_INSTANCIA_COM_PPP: {
        status: StatusDeLancamento.PUBLICO,
        sort: 1000,
        nome: 'Relatório de Aposentadoria Especial - Segunda Instância (com PPP)',
        padroes: [...padroesBasicosSegundaInstancia, padraoApelacaoForcado],
        produtos: [P.PREV_APESP_PONTOS_CONTROVERTIDOS_SEGUNDA_INSTANCIA_COM_PPP, P.CHAT]
    },

    PREV_BI_ANALISE_DE_LAUDO: {
        status: StatusDeLancamento.EM_DESENVOLVIMENTO,
        sort: 1000,
        nome: 'Análise de Laudo Pericial BI',
        padroes: padroesConhecimento,
        // padroes: [
        //     [ANY(), ANY({ capture: [T.LAUDO, T.LAUDO_PERICIA] })],
        // ],
        produtos: [PC(P.PREV_BI_ANALISE_DE_LAUDO, [T.LAUDO, T.LAUDO_PERICIA]), P.CHAT]
    },

    SENTENCA_BI_LAUDO_FAVORAVEL: {
        status: StatusDeLancamento.EM_DESENVOLVIMENTO,
        sort: 1000,
        nome: 'Sentença BI - Laudo Favorável',
        padroes: padroesConhecimento,
        produtos: [P.PREV_BI_SENTENCA_LAUDO_FAVORAVEL, P.CHAT]
    },

    SENTENCA_BI_LAUDO_DESFAVORAVEL: {
        status: StatusDeLancamento.EM_DESENVOLVIMENTO,
        sort: 1000,
        nome: 'Sentença BI - Laudo Desfavorável',
        padroes: padroesConhecimento,
        produtos: [P.PREV_BI_SENTENCA_LAUDO_DESFAVORAVEL, P.CHAT]
    },


    // RESUMOS_ACORDAO: {
    //     sort: 4,
    //     nome: 'Resumos e acórdão',
    //     tipos: [
    //         [T.EXTRATO_DE_ATA, T.RELATORIO, T.VOTO],
    //     ],
    //     produtos: [P.RESUMOS, PC(P.ACORDAO, [T.EXTRATO_DE_ATA, T.VOTO])]
    // },
}

export type TipoDeSinteseEnum = keyof typeof TipoDeSinteseMap;

export interface TipoDeSinteseValido {
    id: TipoDeSinteseEnum,
    nome: string,
    padroes: MatchOperator[][],
    produtos: InfoDeProduto[],
    status: StatusDeLancamento,
}

export interface InfoDeProduto {
    produto: P,
    dados: T[],
    titulo: string,
    prompt: string,
    plugins: Plugin[]
}


const PieceStrategyArray = [
    { id: 1, name: 'MAIS_RELEVANTES', descr: 'Peças mais relevantes', pattern: padroesBasicos },
    { id: 1, name: 'MAIS_RELEVANTES_PRIMEIRA_INSTANCIA', descr: 'Peças mais relevantes para 1ª Instância', pattern: [...padroesConhecimento, padraoConhecimentoForcado] },
    { id: 1, name: 'MAIS_RELEVANTES_SEGUNDA_INSTANCIA', descr: 'Peças mais relevantes para 2ª Instância', pattern: [...padroesBasicosSegundaInstancia, padraoApelacaoForcado] },
    { id: 2, name: 'PETICAO_INICIAL', descr: 'Petição inicial', pattern: TipoDeSinteseMap.PEDIDOS.padroes },
    { id: 2, name: 'PETICAO_INICIAL_E_ANEXOS', descr: 'Petição inicial e anexos', pattern: TipoDeSinteseMap.LITIGANCIA_PREDATORIA.padroes },
    { id: 3, name: 'TIPOS_ESPECIFICOS', descr: 'Peças de tipos específicos', pattern: undefined },
    { id: 3, name: 'TODAS', descr: 'Todas', pattern: TipoDeSinteseMap.INDICE.padroes },
]
export type PieceStrategyValueType = EnumOfObjectsValueType & { descr: string, pattern: MatchOperator[][] | undefined }
export type PieceStrategyType = { [key: string]: PieceStrategyValueType }
export const PieceStrategy: PieceStrategyType = PieceStrategyArray.reduce((acc, cur, idx) => {
    acc[slugify(cur.name).replaceAll('-', '_').toUpperCase()] = { ...cur, sort: idx + 1 }
    return acc
}, {} as PieceStrategyType)

// console.log('PieceStrategy', PieceStrategy)


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

export const selecionarPecasPorPadraoComFase = (pecas: PecaType[], padroes: MatchOperator[][]): SelecionarPecasResultado => {
    let ps: Documento[] = pecas.map(p => ({ id: p.id, tipo: p.descr as T, numeroDoEvento: p.numeroDoEvento, descricaoDoEvento: p.descricaoDoEvento }))

    // Cria um índice de peças por id
    const indexById = {}
    for (let i = 0; i < ps.length; i++) {
        indexById[ps[i].id] = i
    }

    // Cria um índice de matches possíveis
    const matches: MatchFullResult[] = []
    for (const padrao of padroes) {
        const m = matchFull(ps, padrao)
        if (m !== null && m.items.length > 0) {
            matches.push(m)
            break
        }
    }
    if (matches.length === 0) return { pecas: null }

    console.log(matches[0].phasesMatched.map(p => p.phase))
    console.log(matches[0].lastPhase?.phase)

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
    // console.log('acrescentarAnexosDoPJe', pecasSelecionadas.map(p => p.id))
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

