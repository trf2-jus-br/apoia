/**
 * SEI Data Mapping Utilities
 *
 * Converte o JSON retornado pela API REST do SEI (módulo trf2/sei-rest-api-module)
 * para a estrutura simplificada compartilhada com os demais interops.
 *
 * Diferença fundamental em relação ao PDPJ: o SEI não vincula documentos a
 * movimentos (movimentos[].idDocumento é sempre null). Por isso, para cada
 * documento é gerado um movimento sintético ("Inclusão de Documento") e todas
 * as sequências (reais + sintéticas) são renumeradas por dataHora crescente.
 */

import { InteropMovimentoComDocumentosType, InteropParteType, InteropProcessoType } from "./interop-types";
import { nivelDeSigiloFromNivel } from "./pdpj";

// Type definitions for the input SEI JSON structure.
// O payload da API é um array de SeiInput; trabalhamos sempre com data[0].
export interface SeiInput {
    id: string;
    tramitacoes: SeiTramitacao[];
}

export interface SeiTramitacao {
    classe: SeiClasse[];
    nivelSigilo: string;
    dataHoraAjuizamento: string;
    tribunal: {
        sigla: string;
        nome: string;
        segmento: string;
    };
    instancia: string | null;
    natureza: string;
    partes: SeiParte[];
    movimentos: SeiMovimento[];
    documentos: SeiDocumento[];
    processosRelacionados?: SeiProcessoRelacionado[];
}

interface SeiClasse {
    codigo: number;
    nome: string;
}

interface SeiMovimento {
    sequencia: number;
    dataHora: string;
    descricao: string;
    idDocumento: string | null;
    tipo: {
        id: number | null;
    } | null;
}

interface SeiDocumento {
    sequencia: number;
    id: string;
    idOrigem?: string;
    tipo: {
        nome: string;
    };
    arquivo: {
        tipo: string;
        nome: string;
    };
    nivelSigilo: string;
    nome: string;
    dataHoraJuntada: string;
}

// SEI pode enviar partes em formatos variados conforme o órgão; mapeamos o que
// existir e deixamos vazio o resto. Campos opcionais para tolerância.
interface SeiParte {
    polo?: 'ATIVO' | 'PASSIVO' | string;
    nome?: string;
    tipo?: string;
    tipoPessoa?: 'FISICA' | 'JURIDICA' | string;
}

interface SeiProcessoRelacionado {
    tipoRelacao?: string;
    numeroProcesso?: string;
}

/**
 * Converte o JSON do SEI para a estrutura simplificada compartilhada.
 *
 * @param processo - data[0] do payload do SEI ({ id, tramitacoes })
 * @returns Uma lista de processos simplificados, um por tramitação.
 */
export function mapSeiToSimplified(processo: SeiInput): InteropProcessoType[] {
    if (!processo) {
        throw new Error('Invalid SEI data provided');
    }

    if (!processo?.tramitacoes?.length) {
        throw new Error(`No tramitacao found for SEI process ${processo.id}`);
    }

    const processosSimplificados = processo.tramitacoes.map(tramitacao => {

        const processoSimplificado: InteropProcessoType = {
            numeroProcesso: processo.id,
            tribunal: {
                sigla: tramitacao.tribunal?.sigla || '',
                nome: tramitacao.tribunal?.nome || '',
                segmento: tramitacao.tribunal?.segmento || ''
            },
            instancia: tramitacao.instancia || '',
            natureza: tramitacao.natureza || '',
            competencia: '',
            classe: {
                codigo: tramitacao.classe?.[0]?.codigo || 0,
                descricao: tramitacao.classe?.[0]?.nome || ''
            },
            assuntos: [],
            partes: {
                poloAtivo: [],
                poloPassivo: []
            },
            informacoesGerais: {
                dataAjuizamento: tramitacao.dataHoraAjuizamento,
                nivelSigilo: nivelDeSigiloFromNivel(tramitacao.nivelSigilo)
            },
            movimentosEDocumentos: []
        };

        // Process parties (SEI tipicamente não envia; mapeia o que existir).
        tramitacao.partes?.forEach(parte => {
            const parteSimplificada: InteropParteType = {
                nome: parte.nome || '',
                tipo: parte.tipo || '',
                tipoPessoa: (parte.tipoPessoa === 'JURIDICA' ? 'JURIDICA' : 'FISICA'),
                documentos: [],
                representantes: []
            };
            if (parte.polo === 'ATIVO') {
                processoSimplificado.partes.poloAtivo.push(parteSimplificada);
            } else {
                processoSimplificado.partes.poloPassivo.push(parteSimplificada);
            }
        });

        processoSimplificado.movimentosEDocumentos = buildMovimentosEDocumentos(tramitacao);

        return processoSimplificado;
    })

    return processosSimplificados;
}

/**
 * Constrói a lista de movimentos (reais + sintéticos) com seus documentos,
 * ordenada por dataHora crescente e renumerada.
 *
 * O SEI não vincula documentos a movimentos via idDocumento (sempre null).
 * Estratégia:
 *  1. Cria um item para cada movimento real, com documentos: [].
 *  2. Cria um movimento sintético ("Inclusão de Documento") para cada documento,
 *     já com o documento vinculado.
 *  3. Concatena, ordena por dataHora crescente e renumera sequencia de 1..N.
 */
function buildMovimentosEDocumentos(tramitacao: SeiTramitacao): InteropMovimentoComDocumentosType[] {
    const itens: InteropMovimentoComDocumentosType[] = [];

    // 1) Movimentos reais (sem documentos, pois o SEI não faz a associação).
    for (const movimento of tramitacao.movimentos || []) {
        itens.push({
            sequencia: 0, // renumerado abaixo
            dataHora: movimento.dataHora,
            descricao: movimento.descricao,
            orgaoJulgador: '',
            tipo: {
                id: movimento.tipo?.id ?? null,
                nome: '',
                descricao: ''
            },
            documentos: []
        });
    }

    // 2) Movimento sintético por documento ("Inclusão de Documento").
    for (const doc of tramitacao.documentos || []) {
        itens.push({
            sequencia: 0, // renumerado abaixo
            dataHora: doc.dataHoraJuntada,
            descricao: 'Inclusão de Documento',
            orgaoJulgador: '',
            tipo: {
                id: null,
                nome: '',
                descricao: ''
            },
            documentos: [mapearDocumento(doc)]
        });
    }

    // 3) Ordenar por dataHora crescente e renumerar.
    itens.sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
    itens.forEach((item, idx) => { item.sequencia = idx + 1 });

    return itens;
}

/**
 * Mapeia um documento do SEI para o formato compartilhado, aplicando defaults
 * para os campos que o SEI não fornece.
 */
function mapearDocumento(doc: SeiDocumento) {
    return {
        id: doc.id,
        nome: doc.nome,
        nivelSigilo: nivelDeSigiloFromNivel(doc.nivelSigilo),
        tipoDocumento: doc.tipo?.nome || '',
        tipoArquivo: doc.arquivo?.tipo || '',
        quantidadePaginas: 0,
        tamanho: 0,
        tamanhoTexto: formatFileSize(0),
        signatarios: [],
        dataHoraJuntada: doc.dataHoraJuntada
    };
}

/**
 * Formats file size from bytes to human-readable format
 */
function formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
