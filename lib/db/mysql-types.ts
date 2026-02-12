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
    prompt_id?: number | null
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
    prompt_id?: number | null
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
    AUDIO = 8,
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
    is_official?: boolean
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
    created_by?: number | null
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
    is_hidden?: boolean
}

export type IAPromptRating = {
    id: number
    prompt_base_id: number
    user_id: number
    stars: number
    created_at: Date
    updated_at: Date
}

export type IAPromptRatingToInsert = {
    prompt_base_id: number
    user_id: number
    stars: number
}

export type IAPromptRatingStats = {
    prompt_base_id: number
    voter_count: number
    avg_laplace: number
    wilson_score: number
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
    name?: string | null
    usage_count: number
    input_tokens_count: number
    output_tokens_count: number
    approximate_cost: number
}

export type DailyUsageData = {
    date: string
    usage_count: number
    input_tokens_count: number
    output_tokens_count: number
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

// --- Library ---
export enum IALibraryKind {
    ARQUIVO = 'ARQUIVO',
    MODELO = 'MODELO',
    MARKDOWN = 'MARKDOWN'
}

export const IALibraryKindLabels: Record<IALibraryKind, string> = {
    [IALibraryKind.ARQUIVO]: 'Arquivo',
    [IALibraryKind.MODELO]: 'Modelo de Documento',
    [IALibraryKind.MARKDOWN]: 'Texto Markdown'
}

export enum IALibraryInclusion {
    NAO = 'NAO',
    SIM = 'SIM',
    CONTEXTUAL = 'CONTEXTUAL'
}

export const IALibraryInclusionLabels: Record<IALibraryInclusion, string> = {
    [IALibraryInclusion.NAO]: 'Nunca',
    [IALibraryInclusion.SIM]: 'Sempre',
    [IALibraryInclusion.CONTEXTUAL]: 'Contextual'
}

export type IAModelSubtype = 'PRIMEIRO_DESPACHO' | 'SENTENCA' | 'VOTO'

export const IAModelSubtypeLabels: Record<IAModelSubtype, string> = {
    'PRIMEIRO_DESPACHO': 'Primeiro Despacho',
    'SENTENCA': 'Sentença',
    'VOTO': 'Voto'
}

export type IALibrary = {
    id: number
    user_id: number
    kind: IALibraryKind
    model_subtype: IAModelSubtype | null
    title: string
    content_type: string | null
    content_markdown: string | null
    content_binary: Buffer | null
    inclusion: IALibraryInclusion | null
    context: string | null
    created_at: Date | null
    created_by: number | null
}

export type IALibraryToInsert = {
    kind: IALibraryKind
    title: string
    content_type?: string | null
    content_markdown?: string | null
    content_binary?: Buffer | null
    model_subtype?: IAModelSubtype | null
    inclusion?: IALibraryInclusion | null
    context?: string | null
}

export type IALibraryExample = {
    id: number
    library_id: number
    process_number: string
    event_number?: string | null
    piece_type: 'DESPACHO_DECISAO' | 'SENTENCA' | 'VOTO' | null
    piece_id: string | null
    piece_title: string | null
    piece_date: Date | null
    content_markdown: string | null
    created_at: Date | null
    created_by: number | null
}

export type IALibraryAttachment = {
    id: number
    library_id: number
    filename: string
    content_type: string
    file_size: number
    word_count: number | null
    content_text: string | null
    content_binary: Buffer
    created_at: Date | null
    created_by: number | null
}

export type IALibraryAttachmentToInsert = {
    library_id: number
    filename: string
    content_type: string
    file_size: number
    word_count?: number | null
    content_text?: string | null
    content_binary: Buffer
}

// New: Batch and Job types
export type IABatch = {
    id: number
    name: string
    created_by: number | null
    tipo_de_sintese: string | null
    prompt_base_id?: number | null
    complete: boolean
    paused: boolean
    concurrency: number
    created_at: Date | null
    last_activity_at: Date | null
}

export type IABatchJob = {
    id: number
    batch_id: number
    dossier_code: string
    dossier_id: number | null
    status: 'PENDING' | 'RUNNING' | 'READY' | 'ERROR'
    error_msg: string | null
    attempts: number
    created_at: Date | null
    started_at: Date | null
    finished_at: Date | null
    duration_ms: number | null
    cost_sum: number | null
}

// New: Batch fix-index mapping
export type IABatchIndexMap = {
    id: number
    batch_id: number
    descr_from: string
    descr_to: string
    created_at: Date | null
}

export type IABatchSummary = {
    id: number
    name: string
    tipo_de_sintese: string | null
    prompt_base_id?: number | null
    // Latest prompt resolved from prompt_base_id (JOIN ia_prompt ON base_id AND is_latest=1)
    prompt_latest_id?: number | null
    prompt_latest_name?: string | null
    complete: boolean
    paused: boolean
    totals: { total: number, pending: number, running: number, ready: number, error: number }
    spentCost: number
    estimatedTotalCost: number
    avgDurationMs: number | null
    etaMs: number | null
}

// Prompt Usage Report Types
export type PromptUsageReportRow = {
    prompt_key: string
    prompt_name: string
    month: number
    year: number
    usage_count: number
}

export type PromptUsageDetailRow = {
    user_id: number
    user_name: string | null
    username: string | null
    usage_count: number
}

// AI Generations Report Types
export type AIGenerationReportRow = {
    id: number
    created_at: Date
    user_id: number | null
    user_name: string | null
    username: string | null
    court_id: number | null
    prompt_key: string
    prompt_name: string
    model: string
    dossier_code: string | null
    cached_input_tokens: number | null
    input_tokens: number | null
    output_tokens: number | null
    reasoning_tokens: number | null
    total_tokens: number
    approximate_cost: number | null
}

// Court Types (Cache de Tribunais)
export type IACourt = {
    id: number                      // court_id (seq_orgao)
    sigla: string                   // Ex: "TRF2", "JFRJ"
    nome: string                    // Nome completo
    tipo: string | null             // Tipo do órgão
    seq_tribunal_pai: number | null // ID do tribunal pai
    uf: string | null               // UF do tribunal
    created_at: Date
    updated_at: Date
}

export type IACourtToInsert = {
    id: number
    sigla: string
    nome: string
    tipo?: string | null
    seq_tribunal_pai?: number | null
    uf?: string | null
}

// Stats Types (Estatísticas de Gamificação)
export type GlobalStats = {
    totalExecutions: number
    totalHoursSaved: number
    totalActiveUsers: number
    totalCourts: number
    courtRanking: CourtRankingItem[]
    topContributors: TopContributorItem[]
    topUsers: TopUserItem[]
    trendingPrompts: TrendingPromptItem[]
}

export type CourtRankingItem = {
    courtId: number
    sigla: string
    nome: string
    totalExecutions: number
}

export type TopContributorItem = {
    userId: number
    name: string
    username: string
    courtSigla: string | null
    totalExecutions: number
    avgStars: number
    totalRatings: number
    score: number
}

export type TopUserItem = {
    userId: number
    name: string
    username: string
    courtSigla: string | null
    totalExecutions: number
}

export type TrendingPromptItem = {
    promptBaseId: number
    promptName: string
    authorName: string | null
    executionsLast30Days: number
    avgStars: number | null
    totalRatings: number
}

export type UserStats = {
    userId: number
    totalExecutions: number
    hoursSaved: number
    promptsCreatedCount: number
    communityUsageCount: number      // Execuções dos prompts do usuário por terceiros
    executionsByMonth: MonthlyExecutionItem[]
    badges: UserBadges
    myPromptsStats: MyPromptStatsItem[]
}

export type MonthlyExecutionItem = {
    year: number
    month: number
    count: number
}

export type UserBadges = {
    inicipiante: boolean             // Executou o primeiro prompt
    powerUser: boolean               // 100+ execuções
    criador: boolean                 // Criou o primeiro prompt público
    influenciador: boolean           // Prompt executado 50+ vezes por terceiros
    cincoEstrelas: boolean           // Recebeu primeira avaliação 5 estrelas
    curador: boolean                 // Avaliou 20+ prompts da comunidade
    popular: boolean                 // Prompt favoritado por 10+ pessoas
}

export type MyPromptStatsItem = {
    promptBaseId: number
    promptName: string
    executionsByOthers: number
    avgStars: number | null
    totalRatings: number
}
