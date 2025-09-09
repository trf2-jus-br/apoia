
// Type definitions for the simplified output structure
export interface InteropProcessoType {
    numeroProcesso: string;
    tribunal: {
        sigla: string;
        nome: string;
        segmento: string;
    };
    instancia: string;
    natureza: string;
    competencia: string;
    classe: {
        codigo: number;
        descricao: string;
    };
    assuntos: {
        codigo: number;
        descricao: string;
    }[];
    partes: {
        poloAtivo: InteropParteType[];
        poloPassivo: InteropParteType[];
    };
    informacoesGerais: {
        dataAjuizamento: string;
        valorAcao?: number;
        justicaGratuita?: boolean;
        nivelSigilo: string;
    };
    movimentosEDocumentos: InteropMovimentoComDocumentosType[];
}

export interface InteropParteType {
    nome: string;
    tipo: string;
    tipoPessoa: 'FISICA' | 'JURIDICA';
    documentos: string[];
    representantes: {
        nome: string;
        tipo: string;
        oab?: string;
    }[];
}

export interface InteropMovimentoComDocumentosType {
    sequencia: number;
    dataHora: string;
    descricao: string;
    orgaoJulgador: string;
    responsavel?: string;
    tipo: {
        nome: string;
        descricao: string;
    };
    // Array de documentos vinculados a este movimento
    documentos: {
        id: string;
        nome: string;
        nivelSigilo: string;
        tipoDocumento: string;
        tipoArquivo: string;
        quantidadePaginas: number;
        tamanho: number;
        tamanhoTexto: string;
        signatarios: string[];
        dataHoraJuntada: string;
    }[];
}