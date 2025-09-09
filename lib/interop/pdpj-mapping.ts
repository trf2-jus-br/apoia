/**
 * PDPJ Data Mapping Utilities
 * 
 * This module provides functions to convert detailed PDPJ JSON data
 * into simplified structures for easier consumption.
 */

import { InteropMovimentoComDocumentosType, InteropParteType, InteropProcessoType } from "./interop-types";
import { nivelDeSigiloFromNivel } from "./pdpj";

// Type definitions for the input PDPJ JSON structure
export interface PdpjInput {
    id: string;
    numeroProcesso: string;
    tramitacoes: PdpjTramitacao[];
}

interface PdpjTramitacao {
    tribunal: {
        sigla: string;
        nome: string;
        segmento: string;
    };
    competencia: string;
    instancia: string;
    natureza: string;
    classe: PdpjClasse[];
    assunto: PdpjAssunto[];
    partes: PdpjParte[];
    movimentos: PdpjMovimento[];
    documentos: PdpjDocumento[];
    dataHoraAjuizamento: string;
    valorAcao?: number;
    justicaGratuita?: boolean;
    nivelSigilo: string;
}

interface PdpjClasse {
    codigo: number;
    descricao: string;
    hierarquia: string;
}

interface PdpjAssunto {
    codigo: number;
    descricao: string;
    hierarquia: string;
}

interface PdpjParte {
    polo: 'ATIVO' | 'PASSIVO';
    tipoParte: string;
    nome: string;
    tipoPessoa: 'FISICA' | 'JURIDICA';
    representantes: PdpjRepresentante[];
    documentosPrincipais: PdpjDocumentoPrincipal[];
}

interface PdpjRepresentante {
    nome: string;
    tipoRepresentacao: string;
    oab?: PdpjOAB[];
}

interface PdpjOAB {
    numero: string;
    uf: string;
}

interface PdpjDocumentoPrincipal {
    numero: string;
    tipo: string;
}

interface PdpjMovimento {
    sequencia: number;
    dataHora: string;
    descricao: string;
    idDocumento?: string;
    tipo: {
        nome: string;
        descricao: string;
    };
    orgaoJulgador: {
        nome: string;
    };
    magistrado?: {
        nome: string;
    };
    usuario?: {
        nome: string;
    };
}

interface PdpjDocumento {
    id: string;
    sequencia: number;
    dataHoraJuntada: string;
    nome: string;
    nivelSigilo: string;
    tipo: {
        codigo?: number;
        nome: string;
    };
    arquivo: {
        tipo: string;
        quantidadePaginas: number;
        tamanho: number;
        tamanhoTexto: number;
    };
    signatarios: PdpjSignatario[];
}

interface PdpjSignatario {
    nome: string;
}


/**
 * Converts detailed PDPJ JSON data to a simplified structure
 * 
 * @param pdpjData - The raw PDPJ JSON data
 * @returns Simplified process information
 */
export function mapPdpjToSimplified(processo: PdpjInput): InteropProcessoType[] {
    if (!processo) {
        throw new Error('Invalid PDPJ data provided');
    }

    if (!processo?.tramitacoes.length) {
        throw new Error(`No tramitacao found for process ${processo.numeroProcesso}`);
    }

    const processosSimplificados = processo.tramitacoes.map(tramitacao => {

        // Extract basic process information
        const processoSimplificado: InteropProcessoType = {
            numeroProcesso: processo.numeroProcesso,
            tribunal: {
                sigla: tramitacao.tribunal.sigla,
                nome: tramitacao.tribunal.nome,
                segmento: tramitacao.tribunal.segmento
            },
            instancia: tramitacao.instancia,
            natureza: tramitacao.natureza,
            competencia: tramitacao.competencia,
            classe: {
                codigo: tramitacao.classe[0]?.codigo || 0,
                descricao: tramitacao.classe[0]?.descricao || ''
            },
            assuntos: tramitacao.assunto.map(assunto => ({
                codigo: assunto.codigo,
                descricao: assunto.descricao
            })),
            partes: {
                poloAtivo: [],
                poloPassivo: []
            },
            informacoesGerais: {
                dataAjuizamento: tramitacao.dataHoraAjuizamento,
                valorAcao: tramitacao.valorAcao,
                justicaGratuita: tramitacao.justicaGratuita,
                nivelSigilo: nivelDeSigiloFromNivel(tramitacao.nivelSigilo)
            },
            movimentosEDocumentos: []
        };

        // Process parties
        tramitacao.partes.forEach(parte => {
            const parteSimplificada: InteropParteType = {
                nome: parte.nome,
                tipo: parte.tipoParte,
                tipoPessoa: parte.tipoPessoa,
                documentos: parte.documentosPrincipais.map(doc => `${doc.tipo}: ${doc.numero}`),
                representantes: parte.representantes.map(rep => ({
                    nome: rep.nome,
                    tipo: rep.tipoRepresentacao,
                    oab: rep.oab ? `${rep.oab[0]?.numero}/${rep.oab[0]?.uf}` : undefined
                }))
            };

            if (parte.polo === 'ATIVO') {
                processoSimplificado.partes.poloAtivo.push(parteSimplificada);
            } else {
                processoSimplificado.partes.poloPassivo.push(parteSimplificada);
            }
        });

        // Create a map for documents to associate with movements
        const documentosMap = new Map<string, PdpjDocumento>();
        tramitacao.documentos.forEach(doc => {
            documentosMap.set(doc.id, doc);
        });

        // Create movements map to relate documents to movements (following the existing logic)
        const movimentosDocMap = new Map<string, any>();
        for (const mov of tramitacao.movimentos) {
            if (mov.idDocumento) {
                movimentosDocMap.set(mov.idDocumento, mov);
            }
        }

        // Process each movement and assign documents following the reverse document logic
        const movimentosComDocs: InteropMovimentoComDocumentosType[] = [];

        tramitacao.movimentos.forEach(movimento => {
            const movimentoItem: InteropMovimentoComDocumentosType = {
                sequencia: movimento.sequencia,
                dataHora: movimento.dataHora,
                descricao: movimento.descricao,
                orgaoJulgador: movimento.orgaoJulgador?.nome,
                responsavel: movimento.magistrado?.nome || movimento.usuario?.nome,
                tipo: {
                    nome: movimento.tipo.nome,
                    descricao: movimento.tipo.descricao
                },
                documentos: []
            };

            movimentosComDocs.push(movimentoItem);
        });

        // Now assign documents to movements using the reverse logic from the original code
        let currentMov = tramitacao.movimentos[tramitacao.movimentos.length - 1];
        for (let i = tramitacao.documentos.length - 1; i >= 0; i--) {
            const doc = tramitacao.documentos[i];
            const relatedMov = movimentosDocMap.get(doc.id);
            if (relatedMov) {
                currentMov = relatedMov;
            }

            // Find the movement item in our array and add the document
            const movimentoItem = movimentosComDocs.find(m => m.sequencia === currentMov.sequencia);
            if (movimentoItem) {
                movimentoItem.documentos.push({
                    id: doc.id,
                    nome: doc.nome,
                    nivelSigilo: nivelDeSigiloFromNivel(doc.nivelSigilo),
                    tipoDocumento: doc.tipo?.nome,
                    tipoArquivo: doc.arquivo?.tipo,
                    quantidadePaginas: doc.arquivo?.quantidadePaginas,
                    tamanho: doc.arquivo?.tamanho,
                    tamanhoTexto: formatFileSize(doc.arquivo?.tamanhoTexto),
                    signatarios: doc.signatarios?.map(sig => sig.nome),
                    dataHoraJuntada: doc.dataHoraJuntada
                });
            }
        }

        // Sort movements by sequence and sort documents within each movement by date
        processoSimplificado.movimentosEDocumentos = movimentosComDocs
            .sort((a, b) => a.sequencia - b.sequencia)
            .map(mov => ({
                ...mov,
                documentos: mov.documentos.sort((a, b) =>
                    new Date(a.dataHoraJuntada).getTime() - new Date(b.dataHoraJuntada).getTime()
                )
            }));

        return processoSimplificado;
    })

    return processosSimplificados;
}

/**
 * Formats file size from bytes to human-readable format
 * 
 * @param bytes - Size in bytes
 * @returns Formatted size string
 */
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Extracts summary information from simplified process data
 * 
 * @param processoSimplificado - Simplified process data
 * @returns Process summary
 */
export function extractProcessSummary(processoSimplificado: InteropProcessoType): {
    numeroProcesso: string;
    tribunal: string;
    partesResumo: string;
    ultimoMovimento: string;
    quantidadeDocumentos: number;
    quantidadeMovimentos: number;
} {
    const partesAtivas = processoSimplificado.partes.poloAtivo.map(p => p.nome).join(', ');
    const partesPassivas = processoSimplificado.partes.poloPassivo.map(p => p.nome).join(', ');

    const ultimoItem = processoSimplificado.movimentosEDocumentos[processoSimplificado.movimentosEDocumentos.length - 1];

    const quantidadeDocumentos = processoSimplificado.movimentosEDocumentos
        .reduce((total, movimento) => total + movimento.documentos.length, 0);

    const quantidadeMovimentos = processoSimplificado.movimentosEDocumentos.length;

    return {
        numeroProcesso: processoSimplificado.numeroProcesso,
        tribunal: `${processoSimplificado.tribunal.sigla} - ${processoSimplificado.tribunal.nome}`,
        partesResumo: `${partesAtivas} vs ${partesPassivas}`,
        ultimoMovimento: ultimoItem ? ultimoItem.descricao : 'Nenhum movimento encontrado',
        quantidadeDocumentos,
        quantidadeMovimentos
    };
}

