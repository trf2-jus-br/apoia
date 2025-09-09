import { ModelMessage } from "ai";
import { IAGenerated } from "../db/mysql-types";
import { P, Plugin, T } from "../proc/combinacoes";
import { PecaConteudoType } from "../proc/process-types";

// A ideia aqui é que existe uma definição de prompt (PromptDefinitionType) que pode vir do banco de dados ou 
// de um arquivo markdown.
//
// Uma vez que tenhamos a definição do prompt, podemos combinar isso com opções de prompt (PromptOptionsType) 
// de modo a criar uma definição de prompt modificada.
//
// Posteriormente, podemos usar essa definição de prompt para criar uma execução de prompt (PromptExecutionType), 
// que é uma esturtura de dados que contém todas as informações necessárias para executar um prompt. Para isso,
// precisamos de um conjunto de dados (PromptDataType) que são os textos que serão passados para o prompt.
//
// Ainda existe o conceito da configuração de um prompt, que é um conjunto de parâmetros que podem ser definidos
// pelo usuário para configurar um prompt. A configuração fica armazenada em local storage.

// Tipo que define todos os parâmetros de execução de um prompt exceto os dados que serão passados para ele
//
export type PromptDefinitionType = {
    kind: string
    systemPrompt?: string
    prompt?: string
    jsonSchema?: string
    format?: string
    template?: string
    model?: string
    cacheControl?: boolean | number
}

// Tipo que define os textos que serão passados para um prompt
//
export type TextoType = {
    id?: string // identificador da peça no DataLake
    idOrigem?: string // identificador da peça no sistema de origem
    event?: string
    label?: string
    descr: string
    slug: string
    pTexto?: Promise<PecaConteudoType>
    texto?: string
    sigilo: string
}
export type PromptDataType = { 
    numeroDoProcesso?: string, 
    textos: TextoType[] 
}

// Tipo de dados que podem ser passados para a execução de um prompt
//
export type PromptExecuteParamsType = {
    structuredOutputs?: { schemaName: string, schemaDescription: string, schema: any },
    format?: (s: string) => string,
    cacheControl?: boolean | number
}
export type PromptExecuteType = {
    message: ModelMessage[], 
    params?: PromptExecuteParamsType,
    fixedPrompt: string
}

// Tipo de dados que podem ser armazenados para a configuração de um prompt pelo usuário
//
export type PromptConfigType = { prompt_slug?: string, prompt_name?: string, model_slug?: string, model_name?: string, extra?: string }

// Tipo de opções que podem ser passadas para alterar as definições de um prompt
//
export type PromptOptionsType = {
    overrideSystemPrompt?: string
    overridePrompt?: string
    overrideJsonSchema?: string
    overrideFormat?: string
    overrideTemplate?: string
    overrideModel?: string
    cacheControl?: boolean | number
}

// Tipo que permite que a rotina streamContent retorne alguns parâmetros além da stream
//
export type PromptExecutionResultsType = {
    sha256?: string
    model?: string
    generationId?: number
    messagesOnly?: boolean
}

// Tipo que representa o resultado da execução de um prompt pelo componente AiContent
export type ContentType = {
    raw: string
    formated: string
    json: any
}


export type GeneratedContent = {
    id?: number,
    documentCode: string | null, // identificador da peça no Eproc
    documentDescr: string | null, // descrição da peça no Eproc
    documentLocation?: string, // local onde a peça está armazenada
    documentLink?: string, // tipo da peça no Eproc
    
    // infoDeProduto: InfoDeProduto
    title: string,
    produto: P,
    promptSlug: string,
    internalPrompt: PromptDefinitionType,
    data: PromptDataType,
    plugins?: Plugin[],
    sha256?: string,
    result?: Promise<IAGenerated | undefined>,
    generated?: string,
    peca?: T,
}

export type PromptAdditionalInformationType = {
    dossierCode?: string,
    documentId?: string
}

