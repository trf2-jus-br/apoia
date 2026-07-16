/**
 * SEI Data Mapping Utilities
 *
 * Converte o JSON retornado pela API REST do SEI (módulo trf2/sei-rest-api-module)
 * para a estrutura simplificada compartilhada com os demais interops.
 *
 * O SEI não vincula documentos a andamentos via idDocumento nos andamentos,
 * mas as descrições dos andamentos trazem o número do documento e a dataHora.
 * A correlação documento→andamento é feita por:
 *   1) dataHora do documento == dataHora do andamento, E
 *   2) número do documento aparece na descrição do andamento.
 * Quando nenhum andamento casa, é gerado um movimento sintético ("Inclusão de Documento").
 * Todas as sequências (andamentos reais + sintéticos) são renumeradas por dataHora crescente.
 */

import { InteropMovimentoComDocumentosType, InteropParteType, InteropProcessoType } from "./interop-types";
import { nivelDeSigiloFromNivel } from "./pdpj";

// Type definitions for the input SEI JSON structure (novo formato: objeto único).
export interface SeiInput {
    numero: string;
    protocoloFormatado?: string;
    nivelSigilo: string;
    nivelSigiloDescricao?: string;
    tipoProcedimento: {
        id: number;
        nome: string;
    };
    dataGeracao: string;
    orgao: {
        sigla: string;
        nome: string;
    };
    interessados?: SeiInteressado[];
    andamentos: SeiAndamento[];
    documentos: SeiDocumento[];
    processosRelacionados?: SeiProcessoRelacionado[];
}

export interface SeiInteressado {
    nome?: string;
    // Campos opcionais para tolerância a variações entre órgãos.
    polo?: 'ATIVO' | 'PASSIVO' | string;
    tipo?: string;
    tipoPessoa?: 'FISICA' | 'JURIDICA' | string;
}

export interface SeiAndamento {
    sequencia: number;
    dataHora: string;
    descricao: string;
    idTarefa?: number;
}

export interface SeiDocumento {
    sequencia: number;
    numero: string;        // identificador usado nas descrições dos andamentos e na URL de obtenção do binário
    protocoloFormatado?: string;
    idDocumento?: string;  // id de origem (antigo idOrigem)
    tipo: string;
    nome: string;
    nivelSigilo: string;
    mimeType: string;
    nomeArquivo: string;
    dataHora: string;
}

interface SeiProcessoRelacionado {
    tipoRelacao?: string;
    numeroProcesso?: string;
}

/**
 * Converte o JSON do SEI para a estrutura simplificada compartilhada.
 *
 * @param processo - objeto do payload do SEI
 * @returns Uma lista com um processo simplificado (o SEI retorna um único processo).
 */
export function mapSeiToSimplified(processo: SeiInput): InteropProcessoType[] {
    if (!processo) {
        throw new Error('Invalid SEI data provided');
    }

    if (!processo.andamentos && !processo.documentos) {
        throw new Error(`No andamentos/documentos found for SEI process ${processo.numero}`);
    }

    const processoSimplificado: InteropProcessoType = {
        numeroProcesso: processo.numero,
        tribunal: {
            sigla: processo.orgao?.sigla || '',
            nome: processo.orgao?.nome || '',
            segmento: ''
        },
        instancia: '',
        natureza: processo.tipoProcedimento?.nome || '',
        competencia: '',
        classe: {
            codigo: processo.tipoProcedimento?.id || 0,
            descricao: processo.tipoProcedimento?.nome || ''
        },
        assuntos: [],
        partes: {
            poloAtivo: [],
            poloPassivo: []
        },
        informacoesGerais: {
            dataAjuizamento: processo.dataGeracao,
            nivelSigilo: nivelDeSigiloFromNivel(processo.nivelSigilo)
        },
        movimentosEDocumentos: []
    };

    // Mapeia interessados (SEI tipicamente envia vazio; mapeia o que existir).
    (processo.interessados || []).forEach(parte => {
        const parteSimplificada: InteropParteType = {
            nome: parte.nome || '',
            tipo: parte.tipo || '',
            tipoPessoa: (parte.tipoPessoa === 'JURIDICA' ? 'JURIDICA' : 'FISICA'),
            documentos: [],
            representantes: []
        };
        if (parte.polo === 'PASSIVO') {
            processoSimplificado.partes.poloPassivo.push(parteSimplificada);
        } else {
            processoSimplificado.partes.poloAtivo.push(parteSimplificada);
        }
    });

    processoSimplificado.movimentosEDocumentos = buildMovimentosEDocumentos(processo);

    return [processoSimplificado];
}

/**
 * Constrói a lista de movimentos com seus documentos.
 *
 * Estratégia de correlação documento→andamento (por data/hora + número do doc):
 *  1. Para cada documento, busca andamentos com a MESMA dataHora cuja descrição
 *     cite o número do documento. Havendo múltiplos, prefere o de "Registro"/"Geração";
 *     se ainda assim houver empate, fica com o primeiro.
 *  2. Andamentos que receberam ao menos um documento são incluídos com esses docs.
 *     Andamentos sem documentos são incluídos vazios (são movimentos puros).
 *  3. Documentos sem andamento casado geram um movimento sintético
 *     ("Inclusão de Documento") na dataHora do documento.
 *  4. Tudo é concatenado, ordenado por dataHora DECRESCENTE (mais recente =
 *     sequencia 1, posição 0 do array) e renumerado 1..N. A sequencia original
 *     do SEI é descartada.
 */
function buildMovimentosEDocumentos(processo: SeiInput): InteropMovimentoComDocumentosType[] {
    const documentos = processo.documentos || [];
    const andamentos = processo.andamentos || [];

    // Indexa andamentos por dataHora (iso) para lookup rápido.
    const andamentosPorDataHora = new Map<string, SeiAndamento[]>();
    for (const a of andamentos) {
        const key = normalizarDataHora(a.dataHora)
        if (!andamentosPorDataHora.has(key)) andamentosPorDataHora.set(key, [])
        andamentosPorDataHora.get(key)!.push(a)
    }

    // Rastreia quais andamentos foram consumidos (casaram com documento(s)).
    const andamentosConsumidos = new Set<SeiAndamento>()
    // Itens finais (movimentos): cada um com dataHora, descrição e documentos vinculados.
    const itens: { dataHora: string, descricao: string, idTarefa: number | null, documentos: ReturnType<typeof mapearDocumento>[] }[] = []

    for (const doc of documentos) {
        const docDataHora = normalizarDataHora(doc.dataHora)
        const candidatos = (andamentosPorDataHora.get(docDataHora) || [])
            .filter(a => a.descricao?.includes(doc.numero))

        let andamento: SeiAndamento | undefined
        if (candidatos.length === 1) {
            andamento = candidatos[0]
        } else if (candidatos.length > 1) {
            // Tiebreaker: prefere "Registro"/"Geração" de documento público.
            andamento = candidatos.find(a => /registro de documento|gerado documento/i.test(a.descricao))
                || candidatos[0]
        }

        const docMapeado = mapearDocumento(doc)
        if (andamento) {
            andamentosConsumidos.add(andamento)
            // Anexa o documento a um item já criado para este andamento, ou cria um novo.
            let item = itens.find(it => it.descricao === andamento!.descricao && normalizarDataHora(it.dataHora) === docDataHora)
            if (!item) {
                item = { dataHora: andamento.dataHora, descricao: andamento.descricao, idTarefa: andamento.idTarefa ?? null, documentos: [] }
                itens.push(item)
            }
            item.documentos.push(docMapeado)
        } else {
            // Sem andamento casado: movimento sintético.
            itens.push({ dataHora: doc.dataHora, descricao: 'Inclusão de Documento', idTarefa: null, documentos: [docMapeado] })
        }
    }

    // Adiciona andamentos que não casaram com nenhum documento (movimentos puros).
    for (const a of andamentos) {
        if (!andamentosConsumidos.has(a)) {
            itens.push({ dataHora: a.dataHora, descricao: a.descricao, idTarefa: a.idTarefa ?? null, documentos: [] })
        }
    }

    // Numeracao por dataHora DECRESCENTE: mais recente = sequencia 1 (posição 0).
    itens.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
    return itens.map((item, idx) => ({
        sequencia: idx + 1,
        dataHora: item.dataHora,
        descricao: item.descricao,
        orgaoJulgador: '',
        responsavel: '',
        tipo: {
            id: item.idTarefa ?? null,
            nome: '',
            descricao: ''
        },
        documentos: item.documentos
    }))
}

/**
 * Mapeia um documento do SEI para o formato compartilhado, aplicando defaults
 * para os campos que o SEI não fornece.
 */
function mapearDocumento(doc: SeiDocumento) {
    return {
        id: doc.numero,
        nome: doc.nome,
        nivelSigilo: nivelDeSigiloFromNivel(doc.nivelSigilo),
        tipoDocumento: doc.tipo || '',
        tipoArquivo: doc.mimeType || '',
        quantidadePaginas: 0,
        tamanho: 0,
        tamanhoTexto: formatFileSize(0),
        signatarios: [],
        dataHoraJuntada: doc.dataHora
    }
}

/** Normaliza um ISO date-time para uma chave estável (segundos), ignorando ms. */
function normalizarDataHora(iso: string): string {
    return iso?.replace(/\.\d{3}Z$/, 'Z').replace(/\.\d{3}$/, '')
}

/**
 * Formats file size from bytes to human-readable format
 */
function formatFileSize(bytes: number): string {
    if (!bytes) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
