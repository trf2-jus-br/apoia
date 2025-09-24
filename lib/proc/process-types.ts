import { EnumOfObjectsValueType } from "../ai/model-types"
import { IADocument } from "../db/mysql-types"
import { InteropProcessoType } from "../interop/interop-types"
import { slugify } from "../utils/utils"
import { P, ProdutoCompleto, TipoDeSinteseEnum } from "./combinacoes"

export type PecaConteudoType = {
    conteudo: string
    errorMsg?: string
}

export type PecaType = {
    id: string
    idOrigem?: string
    numeroDoProcesso: string
    numeroDoEvento: string
    descricaoDoEvento: string
    descr: string
    tipoDoConteudo: string
    sigilo: string
    pConteudo: Promise<PecaConteudoType> | undefined
    conteudo: string | undefined
    pDocumento: Promise<IADocument> | undefined
    documento: IADocument | undefined
    // pCategoria: Promise<string> | undefined
    categoria: string | undefined
    rotulo: string | undefined
    dataHora: Date | undefined
    errorMsg?: string
}

export type DadosDoProcessoType = {
    pecas: PecaType[]
    pecasSelecionadas?: PecaType[]
    sigilo?: string
    tipoDeSintese?: TipoDeSinteseEnum
    produtos?: (P | ProdutoCompleto)[]
    ajuizamento?: Date
    codigoDaClasse?: number
    classe?: string
    numeroDoProcesso?: string
    nomeOrgaoJulgador?: string
    segmento?: string
    instancia?: string
    materia?: string
    poloAtivo: string
    poloPassivo: string
    oabPoloAtivo?: string
    errorMsg?: string
}

export enum StatusDeLancamento {
    PUBLICO,
    EM_DESENVOLVIMENTO
}


const ScopeArray = [
    { id: 1, name: 'SUPREMO_TRIBUNAL_FEDERAL', descr: 'STF', acronym: 'STF' },
    { id: 1, name: 'SUPERIOR_TRIBUNAL_JUSTICA', descr: 'STJ', acronym: 'STJ' },
    { id: 1, name: 'CONSELHO_NACIONAL_JUSTICA', descr: 'CNJ', acronym: 'CNJ' },
    { id: 2, name: 'JUSTICA_FEDERAL', descr: 'Federal', acronym: 'JF' },
    { id: 3, name: 'JUSTICA_ESTADUAL', descr: 'Estadual', acronym: 'JE' },
    { id: 4, name: 'JUSTICA_TRABALHO', descr: 'Trabalhista', acronym: 'JT' },
    { id: 2, name: 'JUSTICA_ELEITORAL', descr: 'Eleitoral', acronym: 'TRE' },
    { id: 2, name: 'JUSTICA_MILITAR_UNIAO', descr: 'Militar', acronym: 'JMU' },
]
export type ScopeValueType = EnumOfObjectsValueType & { descr: string, acronym: string }
export type ScopeType = { [key: string]: ScopeValueType }
export const Scope: ScopeType = ScopeArray.reduce((acc, cur, idx) => {
    acc[slugify(cur.name).replaceAll('-', '_').toUpperCase()] = { ...cur, sort: idx + 1 }
    return acc
}, {} as ScopeType)


const InstanceArray = [
    { id: 1, name: 'PRIMEIRO_GRAU', descr: 'Primeira', acronym: '1º' },
    { id: 2, name: 'SEGUNDO_GRAU', descr: 'Segunda', acronym: '2º' },
    { id: 3, name: 'TERCEIRO_GRAU', descr: 'Terceira', acronym: '3º' },
]
export type InstanceValueType = EnumOfObjectsValueType & { name: string, descr: string, acronym: string }
export type InstanceType = { [key: string]: InstanceValueType }
export const Instance: InstanceType = InstanceArray.reduce((acc, cur, idx) => {
    acc[slugify(cur.name).replaceAll('-', '_').toUpperCase()] = { ...cur, sort: idx + 1 }
    return acc
}, {} as InstanceType)


const MatterArray = [
    { id: 1, name: 'CIVEL', descr: 'Cível', acronym: 'Cív' },
    { id: 2, name: 'CRIMINAL', descr: 'Criminal', acronym: 'Cri' },
    { id: 3, name: 'ELEITORAL', descr: 'Eleitoral', acronym: 'Ele' },
    { id: 4, name: 'TRABALHISTA', descr: 'Trabalhista', acronym: 'Trab' },
]
export type MatterValueType = EnumOfObjectsValueType & { descr: string, acronym: string }
export type MatterType = { [key: string]: MatterValueType }
export const Matter: MatterType = MatterArray.reduce((acc, cur, idx) => {
    acc[slugify(cur.name).replaceAll('-', '_').toUpperCase()] = { ...cur, sort: idx + 1 }
    return acc
}, {} as MatterType)


const TargetArray = [
    { id: 1, name: 'PROCESSO', descr: 'Peças de Processo' },
    { id: 2, name: 'TEXTO', descr: 'Editor de Texto' },
    { id: 3, name: 'REFINAMENTO', descr: 'Refinamento de Texto' },
]
export type TargetValueType = EnumOfObjectsValueType & { descr: string }

const targetKeys = TargetArray.map(i => i.name)
type TargetKeys = typeof targetKeys[number]
export type TargetType = { [key: TargetKeys]: TargetValueType }
export const Target: TargetType = TargetArray.reduce((acc, cur, idx) => {
    acc[slugify(cur.name).replaceAll('-', '_').toUpperCase()] = { ...cur, sort: idx + 1 }
    return acc
}, {} as TargetType)


const ShareArray = [
    { id: 1, name: 'PADRAO', descr: 'Padrão' },
    { id: 2, name: 'PUBLICO', descr: 'Público' },
    { id: 3, name: 'EM_ANALISE', descr: 'Público (em análise)' },
    { id: 4, name: 'NAO_LISTADO', descr: 'Não Listado' },
    { id: 5, name: 'PRIVADO', descr: 'Privado' },
]
export type ShareValueType = EnumOfObjectsValueType & { name: string, descr: string }

const shareKeys = ShareArray.map(i => i.name)
type ShareKeys = typeof shareKeys[number]
export type ShareType = { [key: ShareKeys]: ShareValueType }
export const Share: ShareType = ShareArray.reduce((acc, cur, idx) => {
    acc[slugify(cur.name).replaceAll('-', '_').toUpperCase()] = { ...cur, sort: idx + 1 }
    return acc
}, {} as ShareType)


export const TEXTO_PECA_SIGILOSA = 'Peça sigilosa, conteúdo não acessado.'
export const TEXTO_PECA_COM_ERRO = 'Não foi possível obter o conteúdo.'
export const TEXTO_PECA_IMAGEM_JPEG = 'Peça no formato de imagem JPEG, conteúdo não acessado.'
export const TEXTO_PECA_IMAGEM_PNG = 'Peça no formato de imagem PNG, conteúdo não acessado.'
export const TEXTO_PECA_VIDEO_XMS_WMV = 'Peça no formato de vídeo X-MS-WMV, conteúdo não acessado.'
export const TEXTO_PECA_VIDEO_MP4 = 'Peça no formato de vídeo MP4, conteúdo não acessado.'
export const TEXTO_PECA_PDF_OCR_VAZIO = 'Peça no formato PDF, conteúdo não acessado. O OCR não retornou texto.'
export const TEXTO_PECA_PDF_OCR_ERRO = 'Peça no formato PDF, conteúdo não acessado. Ocorreu um erro ao processar o OCR.'
export const REGEX_TIPO_DE_CONTEUDO_NAO_SUPORTADO = /^Peça (.+) \((.+)\) - Tipo de conteúdo não suportado: (.+)$/
export const TEXTO_INDICACAO_PARCIAL = '... '
export const REGEX_INDICACAO_PARCIAL = /... $/
export const formatarMensagemDeConteudoNaoSuportado = (idDaPeca: string, descrDaPeca: string, contentType: string) => {
    return `Peça ${idDaPeca} (${descrDaPeca}) - Tipo de conteúdo não suportado: ${contentType}`
}
