export type IAGenerated = {
    id: number
    model: string
    prompt: string
    sha256: string
    prompt_payload?: string | null
    generation: string
    attempt: number | null
    dossier_id?: number | null
    document_id?: number | null
    cached_input_tokens?: number | null
    input_tokens?: number | null
    output_tokens?: number | null
    reasoning_tokens?: number | null
    approximate_cost?: number | null
}

export type IASystem = {
    id: number
    code: string
}

export type IAGeneration = {
    model: string
    prompt: string
    sha256: string
    prompt_payload?: string | null
    generation?: string
    attempt: number | null
    dossier_id?: number | null
    document_id?: number | null
    cached_input_tokens?: number | null
    input_tokens?: number | null
    output_tokens?: number | null
    reasoning_tokens?: number | null
    approximate_cost?: number | null
}

export type AIBatchIdAndEnumId = {
    dossier_code: string,
    enum_item_id: number,
    enum_item_descr: string,
    enum_item_descr_main: string | null,
    batch_dossier_id: number,
    batch_dossier_footer: string | null,
}

export type AICountByBatchIdAndEnumId = {
    enum_item_id: number
    enum_item_descr: string
    hidden: number
    count: number
}

export type AIBatchDossierGeneration = {
    descr: string
    generation: string
    document_id: number
    document_code: string
    prompt: string
}

export type FindAIGeneratedParams = {
    batchName: string
    dossierCode: string
    documentCode: string
    sha256: string
    model: string
}

export type IABatchDossierItem = {
    batch_dossier_id: number
    document_id: number | null
    generation_id: number
    descr: string
    seq: number
}

export type IAEnumItem = {
    enum_id: number
    enum_descr: string
    enum_item_descr: string
    enum_item_hidden: number
    enum_item_descr_main: string | null
}

export enum IADocumentContentSource {
    HTML = 1,
    PDF = 2,
    OCR = 3,
    IMAGE = 4,
    VIDEO = 5,
    OCR_VAZIO = 6,
    OCR_ERRO = 7,
}

export type IADocument = {
    id: number
    dossier_id: number
    code: string
    content_source_id: IADocumentContentSource
    assigned_category: string | null
    predicted_category: string | null
    created_at: Date | null
    content: string
}

export type IAPrompt = {
    id: number
    base_id: number | null
    kind: string
    created_by: number | null
    name: string
    slug: string
    model_id: number,
    testset_id: number | null
    share?: string
    content: {
        author?: string

        scope?: string[]
        instance?: string[]
        matter?: string[]

        target?: string
        editor_label?: string
        piece_strategy?: string
        piece_descr?: string[]
        summary?: string

        system_prompt: string | null
        prompt: string | null
        json_schema: string | null
        format: string | null

        template: string | null
    }
    created_at: Date | null
    is_latest: number
}

export type IAPromptToInsert = {
    base_id?: number
    kind?: string
    name: string
    model_id: number
    testset_id: number | null
    share?: string
    content: {
        system_prompt?: string
        prompt: string | null
        json_schema?: string
        format?: string

        template?: string

        author?: string

        scope?: string[]
        instance?: string[]
        matter?: string[]

        target?: string
        editor_label?: string
        piece_strategy?: string
        piece_descr?: string
        summary?: string
    }
}

export type IAPromptList = {
    id: number
    base_id: number | null
    kind: string
    created_by: number | null
    name: string
    slug: string
    model_id: number,
    testset_id: number | null
    share?: string
    content: {
        author?: string

        scope?: string[]
        instance?: string[]
        matter?: string[]

        target?: string
        editor_label?: string
        piece_strategy?: string
        piece_descr?: string[]
        summary?: string

        system_prompt: string | null
        prompt: string | null
        json_schema: string | null
        format: string | null

        template: string | null
    }
    created_at: Date | null
    is_latest: number
    is_mine: boolean
    is_favorite: number
    favorite_count: number
    is_internal?: boolean
}



export type IATestset = {
    id: number
    base_testset_id: number | null
    kind: string
    created_by: number | null
    name: string
    slug: string
    model_id: number
    content: {
        tests: {
            name: string
            variables: {
                name: string
                value: string
            }[]
            texts: {
                name: string
                value: string
            }[]
            expected: string
            questions: {
                question: string
            }[]
        }[]
    }
    created_at: Date | null
}

export type IATestsetToInsert = {
    base_testset_id: number | null
    kind: string
    created_by: number | null
    name: string
    model_id: number
    content: {
        tests: {
            name: string
            variables: {
                name: string
                value: string
            }[]
            texts: {
                name: string
                value: string
            }[]
            expected: string
            questions: {
                question: string
            }[]
        }[]
    }
}

export type IARankingType = {
    testset_id: number
    testset_name: string
    prompt_id: number
    prompt_name: string
    prompt_slug: string
    model_id: number
    model_name: string
    score: number
}

export type IATestTestQuestion = {
    question: string
}

export type IATestTestAttemptAnswer = {
    snippet: string
    result: boolean
    justification: string
}

export type IATestTestAttempt = {
    result: string
    answers: IATestTestAttemptAnswer[]
}

export type IATestTest = {
    name: string
    questions: IATestTestQuestion[]
    attempts: IATestTestAttempt[]
}

export type IATest = {
    id: number
    testset_id: number
    prompt_id: number
    model_id: number
    score: number
    content: {
        tests: IATestTest[]
    }
}

export type IAModel = {
    id: number
    name: string
    created_at: Date
}

export function updateWithLatestAndOfficial(l) {
    return l.map(i => ({ id: i.id, name: i.name + (i.is_official ? ' (oficial)' : i.is_last ? ' (último)' : '') }))
}

export type SelectableItemWithLatestAndOfficial = { id: string, name: string, slug: string, created_at: Date, is_last: boolean, is_official: boolean }
export type SelectableItem = { id: string, name: string }

export type PromptByKind = {
    id: number, testset_id: number, model_id: number, kind: string, name: string, slug: string, content: any, created_by: number, created_at: Date, is_official: boolean, testset_slug: string, testset_name: string, model_name: string, user_username: string, score: number
}

export type CourtUsageData = {
    date: string
    usage_count: number
    approximate_cost: number
}

export type UserUsageData = {
    id: string
    username: string
    usage_count: number
    approximate_cost: number
}

export type IAUserUpdateFields = {
    name?: string | null
    cpf?: string | null
    email?: string | null
    unit_id?: number | null
    unit_name?: string | null
    court_id?: number | null
    court_name?: string | null
    state_abbreviation?: string | null
}

export type IAUsageReportRow = {
    user_id: number | null
    user_name: string | null // nome completo do usuário
    dossier_id: number | null
    dossier_code: string | null
    first_generation_at: Date | null
    last_generation_at: Date | null
    generations_count: number
    approximate_cost_sum: number
    user_cpf?: string | null
}

export type IAUsageDetailRow = {
    id: number
    dossier_code: string | null
    user_id: number | null
    username: string | null
    user_name: string | null
    user_cpf: string | null
    created_at: Date | null
    generation: string | null
    prompt_payload: string | null
    approximate_cost: number | null
    model?: string | null
    prompt?: string | null
}