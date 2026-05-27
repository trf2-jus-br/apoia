import { StatusDeLancamento } from "../proc/process-types"
import devLog from "../utils/log"
import { slugify } from "../utils/utils"
import { UsageType } from "./prompt-types"

// Tipos de arquivos que podem ser suportados diretamente por modelos
export enum FileTypeEnum {
    PDF = 'application/pdf',
    MP3 = 'audio/mpeg',
    MP4 = 'video/mp4',
    WMA = 'audio/x-ms-wma',
    WMV = 'video/x-ms-wmv',
    WAV = 'audio/wav',
    AIFF = 'audio/aiff',
    AAC = 'audio/aac',
    OGG = 'audio/ogg',
    FLAC = 'audio/flac',
}

export type EnumOfObjectsValueType = { id: number, name: string, sort: number }
export type EnumOfObjectsType = { [key: string]: EnumOfObjectsValueType }

const ModelProfileArray = [
    { key: 'PADRAO', name: 'Padrão' },
    { key: 'PADRAO_MP3', name: 'Padrão com MP3' },
    { key: 'PADRAO_PDF', name: 'Padrão com PDF' },
    { key: 'PADRAO_MP3_PDF', name: 'Padrão com MP3 e PDF' },
    { key: 'PREMIUM', name: 'Premium' },
    { key: 'PREMIUM_MP3', name: 'Premium com MP3' },
    { key: 'PREMIUM_PDF', name: 'Premium com PDF' },
    { key: 'PREMIUM_MP3_PDF', name: 'Premium com MP3 e PDF' },
    { key: 'VERSATIL', name: 'Versátil' },
    { key: 'VERSATIL_MP3', name: 'Versátil com MP3' },
    { key: 'VERSATIL_PDF', name: 'Versátil com PDF' },
    { key: 'VERSATIL_MP3_PDF', name: 'Versátil com MP3 e PDF' },
    { key: 'EFICIENTE', name: 'Eficiente' },
    { key: 'EFICIENTE_MP3', name: 'Eficiente com MP3' },
    { key: 'EFICIENTE_PDF', name: 'Eficiente com PDF' },
    { key: 'EFICIENTE_MP3_PDF', name: 'Eficiente com MP3 e PDF' },
] as const

type ModelProfileTier = 'PADRAO' | 'PREMIUM' | 'VERSATIL' | 'EFICIENTE'

export type ModelProfileKey = typeof ModelProfileArray[number]['key']
export type ModelProfileValueType = EnumOfObjectsValueType & {
    key: ModelProfileKey
    tier: ModelProfileTier
    requiresMp3: boolean
    requiresPdf: boolean
}
export type ModelProfileType = { [key in ModelProfileKey]: ModelProfileValueType }

export const ModelProfile: ModelProfileType = ModelProfileArray.reduce((acc, item, idx) => {
    const { key, name } = item
    const parts = key.split('_')
    const tier = parts[0] as ModelProfileTier
    acc[key] = {
        key,
        id: idx + 1,
        name,
        sort: idx + 1,
        tier,
        requiresMp3: parts.includes('MP3'),
        requiresPdf: parts.includes('PDF'),
    }
    return acc
}, {} as ModelProfileType)

export type ParsedModelConfigType = {
    selectableModels: string[]
    profileModels: Partial<Record<ModelProfileKey, string>>
    defaultModel?: string
}

const ModelProviderArray = [
    { id: 2, name: 'OpenAI', apiKey: 'OPENAI_API_KEY', apiKeyRegex: /^sk-proj-[a-zA-Z0-9_]{48,164}$/, status: StatusDeLancamento.PUBLICO },
    { id: 1, name: 'Anthropic', apiKey: 'ANTHROPIC_API_KEY', apiKeyRegex: /^sk-[a-zA-Z0-9_-]{100,110}$/, status: StatusDeLancamento.PUBLICO },
    { id: 3, name: 'Google', apiKey: 'GOOGLE_API_KEY', apiKeyRegex: /^AI[a-zA-Z0-9]{37}$/, status: StatusDeLancamento.PUBLICO },
    { id: 4, name: 'Azure', apiKey: 'AZURE_API_KEY', resourceName: 'AZURE_RESOURCE_NAME', apiKeyRegex: /^[a-zA-Z0-9]{32,84}$/, status: StatusDeLancamento.PUBLICO },
    { id: 7, name: 'AWS', apiKey: 'AWS_SECRET_ACCESS_KEY', accessKeyId: 'AWS_ACCESS_KEY_ID', region: 'AWS_REGION', apiKeyRegex: /^sk-[a-zA-Z0-9]{32}$/, status: StatusDeLancamento.PUBLICO },
    { id: 5, name: 'Groq', apiKey: 'GROQ_API_KEY', apiKeyRegex: /^gsk_[a-zA-Z0-9]{52}$/, status: StatusDeLancamento.EM_DESENVOLVIMENTO },
    { id: 6, name: 'DeepSeek', apiKey: 'DEEPSEEK_API_KEY', apiKeyRegex: /^sk-[a-zA-Z0-9]{32}$/, status: StatusDeLancamento.EM_DESENVOLVIMENTO },
    { id: 9, name: 'OpenRouter', apiKey: 'OPENROUTER_API_KEY', models: 'OPENROUTER_MODELS', apiKeyRegex: /^sk-or-v1-[a-zA-Z0-9_-]+$/, status: StatusDeLancamento.EM_DESENVOLVIMENTO },
    { id: 8, name: 'On-premises', apiKey: 'ON_PREMISES_API_KEY', resourceName: 'ON_PREMISES_URL', models: 'ON_PREMISES_MODELS', apiKeyRegex: /.*/, status: StatusDeLancamento.EM_DESENVOLVIMENTO },
]

export type ModelProviderValueType = EnumOfObjectsValueType & { apiKey: string, resourceName?: string, region?: string, accessKeyId?: string, models?: string, apiKeyRegex: RegExp, status: StatusDeLancamento }
export type ModelProviderType = { [key: string]: ModelProviderValueType }

// export const ModelProvider: ModelProviderType = {
//     OPENAI: { sort: 1, id: 2, name: 'OpenAI', apiKey: 'OPENAI_API_KEY', apiKeyRegex: /^sk-proj-[a-zA-Z0-9_]{48,164}$/ },
//     ANTHROPIC: { sort: 2, id: 1, name: 'Anthropic', apiKey: 'ANTHROPIC_API_KEY', apiKeyRegex: /^sk-[a-zA-Z0-9_-]{100,110}$/ },
//     GOOGLE: { sort: 3, id: 3, name: 'Google', apiKey: 'GOOGLE_API_KEY', apiKeyRegex: /^AI[a-zA-Z0-9]{37}$/ },
//     GROQ: { sort: 4, id: 4, name: 'Groq', apiKey: 'GROQ_API_KEY', apiKeyRegex: /^gsk_[a-zA-Z0-9]{52}$/ },
//     DEEPSEEK: { sort: 5, id: 5, name: 'DeepSeek', apiKey: 'DEEPSEEK_API_KEY', apiKeyRegex: /^sk-[a-zA-Z0-9]{32}$/ },
// }

export const ModelProvider: ModelProviderType = ModelProviderArray.reduce((acc, cur, idx) => {
    acc[slugify(cur.name).replaceAll('-', '_').toUpperCase()] = { ...cur, sort: idx + 1 }
    return acc
}, {} as ModelProviderType)

type ModelArrayType = {
    id: number
    name: string
    provider: ModelProviderValueType
    cachedInputTokenPPM: number
    inputTokenPPM: number
    outputTokenPPM: number
    status: StatusDeLancamento
    clip?: number
    supportedFileTypes?: FileTypeEnum[]
}

const ModelArray: ModelArrayType[] = [
    { id: 21, name: 'gpt-5.5', provider: ModelProvider.OPENAI, cachedInputTokenPPM: 0.5, inputTokenPPM: 5, outputTokenPPM: 30, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 21, name: 'gpt-5.4-mini', provider: ModelProvider.OPENAI, cachedInputTokenPPM: 0.08, inputTokenPPM: 0.75, outputTokenPPM: 4.5, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 21, name: 'gpt-5.4-nano', provider: ModelProvider.OPENAI, cachedInputTokenPPM: 0.02, inputTokenPPM: 0.2, outputTokenPPM: 1.25, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 21, name: 'gpt-5.4', provider: ModelProvider.OPENAI, cachedInputTokenPPM: 0.5, inputTokenPPM: 5, outputTokenPPM: 22.5, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 15, name: 'gpt-5.2', provider: ModelProvider.OPENAI, cachedInputTokenPPM: 0.175, inputTokenPPM: 1.75, outputTokenPPM: 14, status: StatusDeLancamento.PUBLICO },
    { id: 15, name: 'gpt-5.2-chat-latest', provider: ModelProvider.OPENAI, cachedInputTokenPPM: 0.175, inputTokenPPM: 1.75, outputTokenPPM: 14, status: StatusDeLancamento.PUBLICO },
    { id: 15, name: 'gpt-5.1', provider: ModelProvider.OPENAI, cachedInputTokenPPM: 0.125, inputTokenPPM: 1.25, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO },
    { id: 15, name: 'gpt-5.1-chat-latest', provider: ModelProvider.OPENAI, cachedInputTokenPPM: 0.125, inputTokenPPM: 1.25, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO },
    { id: 16, name: 'gpt-5-mini', provider: ModelProvider.OPENAI, cachedInputTokenPPM: 0.025, inputTokenPPM: 0.25, outputTokenPPM: 2, status: StatusDeLancamento.PUBLICO },
    { id: 17, name: 'gpt-5-nano', provider: ModelProvider.OPENAI, cachedInputTokenPPM: 0.005, inputTokenPPM: 0.05, outputTokenPPM: 0.4, status: StatusDeLancamento.PUBLICO },
    { id: 15, name: 'gpt-5', provider: ModelProvider.OPENAI, cachedInputTokenPPM: 0.125, inputTokenPPM: 1.25, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO },
    { id: 15, name: 'gpt-5-chat-latest', provider: ModelProvider.OPENAI, cachedInputTokenPPM: 0.125, inputTokenPPM: 1.25, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO },
    { id: 16, name: 'gpt-4.1-mini', provider: ModelProvider.OPENAI, cachedInputTokenPPM: 0.2, inputTokenPPM: 0.4, outputTokenPPM: 1.6, status: StatusDeLancamento.PUBLICO, clip: 1000, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 17, name: 'gpt-4.1-nano', provider: ModelProvider.OPENAI, cachedInputTokenPPM: 0.05, inputTokenPPM: 0.1, outputTokenPPM: 0.4, status: StatusDeLancamento.PUBLICO, clip: 1000, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 15, name: 'gpt-4.1', provider: ModelProvider.OPENAI, cachedInputTokenPPM: 0.75, inputTokenPPM: 2, outputTokenPPM: 8, status: StatusDeLancamento.PUBLICO, clip: 1000, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 3, name: 'gpt-4o-mini-2024-07-18', provider: ModelProvider.OPENAI, cachedInputTokenPPM: 0.1, inputTokenPPM: 0.15, outputTokenPPM: 0.6, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 7, name: 'gpt-4o-2024-11-20', provider: ModelProvider.OPENAI, cachedInputTokenPPM: 1.25, inputTokenPPM: 2.5, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 1, name: 'gpt-4o-2024-08-06', provider: ModelProvider.OPENAI, cachedInputTokenPPM: 1.25, inputTokenPPM: 2.5, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 22, name: 'claude-opus-4-5-20251101', provider: ModelProvider.ANTHROPIC, cachedInputTokenPPM: 0.5, inputTokenPPM: 5, outputTokenPPM: 25, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 22, name: 'claude-sonnet-4-5-20250929', provider: ModelProvider.ANTHROPIC, cachedInputTokenPPM: 0.6, inputTokenPPM: 6, outputTokenPPM: 22.5, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 22, name: 'claude-sonnet-4-20250514', provider: ModelProvider.ANTHROPIC, cachedInputTokenPPM: 0.3, inputTokenPPM: 3, outputTokenPPM: 15, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 13, name: 'claude-3-7-sonnet-20250219', provider: ModelProvider.ANTHROPIC, cachedInputTokenPPM: 0.3, inputTokenPPM: 3, outputTokenPPM: 15, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 2, name: 'claude-3-5-sonnet-20241022', provider: ModelProvider.ANTHROPIC, cachedInputTokenPPM: 0.3, inputTokenPPM: 3, outputTokenPPM: 15, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 14, name: 'claude-haiku-4-5-20251001', provider: ModelProvider.ANTHROPIC, cachedInputTokenPPM: 0.1, inputTokenPPM: 1, outputTokenPPM: 5, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 14, name: 'claude-3-5-haiku-20241022', provider: ModelProvider.ANTHROPIC, cachedInputTokenPPM: 0.08, inputTokenPPM: 0.8, outputTokenPPM: 4, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    // { id: 18, name: 'gemini-flash-latest', provider: ModelProvider.GOOGLE, cachedInputTokenPPM: 0.03, inputTokenPPM: 0.30, outputTokenPPM: 2.5, status: StatusDeLancamento.PUBLICO, clip: 1000, supportedFileTypes: [FileTypeEnum.PDF, FileTypeEnum.MP3, FileTypeEnum.MP4, FileTypeEnum.WAV, FileTypeEnum.AIFF, FileTypeEnum.AAC, FileTypeEnum.OGG, FileTypeEnum.FLAC] },
    { id: 10, name: 'gemini-3-flash-preview', provider: ModelProvider.GOOGLE, cachedInputTokenPPM: 0.05, inputTokenPPM: 0.50, outputTokenPPM: 3, status: StatusDeLancamento.PUBLICO, clip: 1000, supportedFileTypes: [FileTypeEnum.PDF, FileTypeEnum.MP3, FileTypeEnum.MP4, FileTypeEnum.WAV, FileTypeEnum.AIFF, FileTypeEnum.AAC, FileTypeEnum.OGG, FileTypeEnum.FLAC] },
    { id: 10, name: 'gemini-3.5-flash', provider: ModelProvider.GOOGLE, cachedInputTokenPPM: 0.15, inputTokenPPM: 1.50, outputTokenPPM: 9, status: StatusDeLancamento.PUBLICO, clip: 1000, supportedFileTypes: [FileTypeEnum.PDF, FileTypeEnum.MP3, FileTypeEnum.MP4, FileTypeEnum.WAV, FileTypeEnum.AIFF, FileTypeEnum.AAC, FileTypeEnum.OGG, FileTypeEnum.FLAC] },
    { id: 10, name: 'gemini-3.1-flash-lite', provider: ModelProvider.GOOGLE, cachedInputTokenPPM: 0.025, inputTokenPPM: 0.25, outputTokenPPM: 1.5, status: StatusDeLancamento.PUBLICO, clip: 1000, supportedFileTypes: [FileTypeEnum.PDF, FileTypeEnum.MP3, FileTypeEnum.MP4, FileTypeEnum.WAV, FileTypeEnum.AIFF, FileTypeEnum.AAC, FileTypeEnum.OGG, FileTypeEnum.FLAC] },
    { id: 18, name: 'gemini-2.5-flash', provider: ModelProvider.GOOGLE, cachedInputTokenPPM: 0.03, inputTokenPPM: 0.30, outputTokenPPM: 2.5, status: StatusDeLancamento.PUBLICO, clip: 1000, supportedFileTypes: [FileTypeEnum.PDF, FileTypeEnum.MP3, FileTypeEnum.MP4, FileTypeEnum.WAV, FileTypeEnum.AIFF, FileTypeEnum.AAC, FileTypeEnum.OGG, FileTypeEnum.FLAC] },
    // { id: 18, name: 'gemini-flash-lite-latest', provider: ModelProvider.GOOGLE, cachedInputTokenPPM: 0.01, inputTokenPPM: 0.10, outputTokenPPM: 0.40, status: StatusDeLancamento.PUBLICO, clip: 1000, supportedFileTypes: [FileTypeEnum.PDF, FileTypeEnum.MP3, FileTypeEnum.MP4, FileTypeEnum.WAV, FileTypeEnum.AIFF, FileTypeEnum.AAC, FileTypeEnum.OGG, FileTypeEnum.FLAC] },
    { id: 18, name: 'gemini-2.5-flash-lite', provider: ModelProvider.GOOGLE, cachedInputTokenPPM: 0.01, inputTokenPPM: 0.10, outputTokenPPM: 0.40, status: StatusDeLancamento.PUBLICO, clip: 1000, supportedFileTypes: [FileTypeEnum.PDF, FileTypeEnum.MP3, FileTypeEnum.MP4, FileTypeEnum.WAV, FileTypeEnum.AIFF, FileTypeEnum.AAC, FileTypeEnum.OGG, FileTypeEnum.FLAC] },
    // { id: 9, name: 'gemini-2.0-flash', provider: ModelProvider.GOOGLE, inputTokenPPM: 0.1, outputTokenPPM: 0.4, status: StatusDeLancamento.PUBLICO },
    { id: 10, name: 'gemini-2.5-pro', provider: ModelProvider.GOOGLE, cachedInputTokenPPM: 0.25, inputTokenPPM: 2.5, outputTokenPPM: 15, status: StatusDeLancamento.PUBLICO, clip: 1000, supportedFileTypes: [FileTypeEnum.PDF, FileTypeEnum.MP3, FileTypeEnum.MP4, FileTypeEnum.WAV, FileTypeEnum.AIFF, FileTypeEnum.AAC, FileTypeEnum.OGG, FileTypeEnum.FLAC] },
    { id: 10, name: 'gemini-3.1-pro-preview', provider: ModelProvider.GOOGLE, cachedInputTokenPPM: 0.4, inputTokenPPM: 4, outputTokenPPM: 18, status: StatusDeLancamento.PUBLICO, clip: 1000, supportedFileTypes: [FileTypeEnum.PDF, FileTypeEnum.MP3, FileTypeEnum.MP4, FileTypeEnum.WAV, FileTypeEnum.AIFF, FileTypeEnum.AAC, FileTypeEnum.OGG, FileTypeEnum.FLAC] },

    // { id: 4, name: 'gemini-1.5-pro-002', provider: ModelProvider.GOOGLE, inputTokenPPM: 2.5, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO },
    // { id: 5, name: 'llama-3.2-90b-text-preview', provider: ModelProvider.GROQ, inputTokenPPM: 1, outputTokenPPM: 1, status: StatusDeLancamento.EM_DESENVOLVIMENTO },
    // { id: 6, name: 'llama-3.1-70b-versatile', provider: ModelProvider.GROQ, inputTokenPPM: 1, outputTokenPPM: 1, status: StatusDeLancamento.EM_DESENVOLVIMENTO },
    { id: 8, name: 'deepseek-chat', provider: ModelProvider.DEEPSEEK, cachedInputTokenPPM: 0.028, inputTokenPPM: 0.28, outputTokenPPM: 0.42, status: StatusDeLancamento.EM_DESENVOLVIMENTO },
    // { id: 19, name: 'azure-gpt-5-mini', provider: ModelProvider.AZURE, inputTokenPPM: 0.25, outputTokenPPM: 2, status: StatusDeLancamento.PUBLICO },
    // { id: 20, name: 'azure-gpt-5-nano', provider: ModelProvider.AZURE, inputTokenPPM: 0.05, outputTokenPPM: 0.4, status: StatusDeLancamento.PUBLICO },
    // { id: 21, name: 'azure-gpt-5', provider: ModelProvider.AZURE, inputTokenPPM: 1.25, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO },
    // { id: 21, name: 'azure-gpt-5-chat', provider: ModelProvider.AZURE, inputTokenPPM: 1.25, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO },
    { id: 21, name: 'azure-gpt-5.5', provider: ModelProvider.AZURE, cachedInputTokenPPM: 0.5, inputTokenPPM: 5, outputTokenPPM: 30, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 21, name: 'azure-gpt-5.4', provider: ModelProvider.AZURE, cachedInputTokenPPM: 0.5, inputTokenPPM: 5, outputTokenPPM: 22.5, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 21, name: 'azure-gpt-5.4-mini', provider: ModelProvider.AZURE, cachedInputTokenPPM: 0.08, inputTokenPPM: 0.75, outputTokenPPM: 4.5, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 21, name: 'azure-gpt-5.4-nano', provider: ModelProvider.AZURE, cachedInputTokenPPM: 0.02, inputTokenPPM: 0.2, outputTokenPPM: 1.25, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 21, name: 'azure-gpt-5.2', provider: ModelProvider.AZURE, cachedInputTokenPPM: 0.175, inputTokenPPM: 1.75, outputTokenPPM: 14, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 21, name: 'azure-gpt-5.2-chat', provider: ModelProvider.AZURE, cachedInputTokenPPM: 0.175, inputTokenPPM: 1.75, outputTokenPPM: 14, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 21, name: 'azure-gpt-5.1', provider: ModelProvider.AZURE, cachedInputTokenPPM: 0.13, inputTokenPPM: 1.25, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 21, name: 'azure-gpt-5.1-chat', provider: ModelProvider.AZURE, cachedInputTokenPPM: 0.13, inputTokenPPM: 1.25, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 19, name: 'azure-gpt-5-mini', provider: ModelProvider.AZURE, cachedInputTokenPPM: 0.025, inputTokenPPM: 0.25, outputTokenPPM: 2, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 20, name: 'azure-gpt-5-nano', provider: ModelProvider.AZURE, cachedInputTokenPPM: 0.005, inputTokenPPM: 0.05, outputTokenPPM: 0.4, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 21, name: 'azure-gpt-5', provider: ModelProvider.AZURE, cachedInputTokenPPM: 0.125, inputTokenPPM: 1.25, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 21, name: 'azure-gpt-5-chat', provider: ModelProvider.AZURE, cachedInputTokenPPM: 0.75, inputTokenPPM: 2, outputTokenPPM: 8, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 19, name: 'azure-gpt-4.1-mini', provider: ModelProvider.AZURE, cachedInputTokenPPM: 0.2, inputTokenPPM: 0.4, outputTokenPPM: 1.6, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 20, name: 'azure-gpt-4.1-nano', provider: ModelProvider.AZURE, cachedInputTokenPPM: 0.05, inputTokenPPM: 0.1, outputTokenPPM: 0.4, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 21, name: 'azure-gpt-4.1', provider: ModelProvider.AZURE, cachedInputTokenPPM: 0.75, inputTokenPPM: 2, outputTokenPPM: 8, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 11, name: 'azure-gpt-4o', provider: ModelProvider.AZURE, cachedInputTokenPPM: 1.25, inputTokenPPM: 2.5, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 12, name: 'azure-gpt-4o-mini', provider: ModelProvider.AZURE, cachedInputTokenPPM: 0.1, inputTokenPPM: 0.15, outputTokenPPM: 0.6, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    // { id: 22, name: 'aws-anthropic.claude-3-haiku-20240307-v1:0', provider: ModelProvider.AWS, status: StatusDeLancamento.PUBLICO },
    { id: 22, name: 'aws-us.anthropic.claude-3-5-haiku-20241022-v1:0', provider: ModelProvider.AWS, cachedInputTokenPPM: 0.08, inputTokenPPM: 0.8, outputTokenPPM: 4, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 22, name: 'aws-us.anthropic.claude-sonnet-4-20250514-v1:0', provider: ModelProvider.AWS, cachedInputTokenPPM: 0.3, inputTokenPPM: 3, outputTokenPPM: 15, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
]

export type ModelValueType = EnumOfObjectsValueType & { provider: ModelProviderValueType, cachedInputTokenPPM: number, inputTokenPPM: number, outputTokenPPM: number, status: StatusDeLancamento, clip?: number, supportedFileTypes?: FileTypeEnum[] }
export type ModelType = { [key: string]: ModelValueType }

export const Model: ModelType = ModelArray.reduce((acc, cur, idx) => {
    acc[slugify(cur.name).replaceAll('-', '_').toUpperCase()] = { ...cur, sort: idx + 1 }
    return acc
}, {} as ModelType)

export type ConfiguredModelValueType = {
    name: string
    provider: ModelProviderValueType
    cachedInputTokenPPM?: number
    inputTokenPPM?: number
    outputTokenPPM?: number
    clip?: number
    supportedFileTypes?: FileTypeEnum[]
}

const AUDIO_FILE_TYPES = [FileTypeEnum.MP3, FileTypeEnum.WMA, FileTypeEnum.WAV, FileTypeEnum.AIFF, FileTypeEnum.AAC, FileTypeEnum.OGG, FileTypeEnum.FLAC]
const VIDEO_FILE_TYPES = [FileTypeEnum.MP4, FileTypeEnum.WMV]

export function normalizeModelProfile(value?: string): ModelProfileKey | undefined {
    if (!value) return undefined
    const normalized = slugify(value).replaceAll('-', '_').toUpperCase()
    return ModelProfileArray.find(profile => profile.key === normalized)?.key
}

export function isModelProfile(value?: string): value is ModelProfileKey {
    return !!normalizeModelProfile(value)
}

export function getModelProfileFallbackOrder(requestedProfile: ModelProfileKey): ModelProfileKey[] {
    const requested = ModelProfile[requestedProfile]
    const matchesTier = (profile: ModelProfileValueType, tier: ModelProfileTier) => profile.tier === tier
    const supportsRequested = (profile: ModelProfileValueType) => {
        if (requested.requiresMp3 && !profile.requiresMp3) return false
        if (requested.requiresPdf && !profile.requiresPdf) return false
        return true
    }

    const sameTier = ModelProfileArray.map(profile => profile.key)
        .filter(key => matchesTier(ModelProfile[key], requested.tier) && supportsRequested(ModelProfile[key]))
    const defaultTier = requested.tier === 'PADRAO'
        ? []
        : ModelProfileArray.map(profile => profile.key).filter(key => matchesTier(ModelProfile[key], 'PADRAO') && supportsRequested(ModelProfile[key]))
    const fallback = [...sameTier, ...defaultTier, 'PADRAO']
    return Array.from(new Set(fallback)) as ModelProfileKey[]
}

export function parseModelConfig(modelsConfig?: string): ParsedModelConfigType {
    const parsed: ParsedModelConfigType = { selectableModels: [], profileModels: {} }
    if (!modelsConfig?.trim()) return parsed

    for (const entry of modelsConfig.split(';').map(item => item.trim()).filter(Boolean)) {
        const separatorIndex = entry.indexOf(':')
        const profileCandidate = separatorIndex >= 0 ? entry.slice(0, separatorIndex).trim() : undefined
        const maybeProfile = profileCandidate ? normalizeModelProfile(profileCandidate) : undefined
        if (maybeProfile) {
            const modelName = entry.slice(separatorIndex + 1).trim()
            if (modelName) parsed.profileModels[maybeProfile] = modelName
            continue
        }

        if (profileCandidate && /^[A-Za-z_\-]+$/.test(profileCandidate)) {
            console.warn(`Ignoring invalid model profile '${profileCandidate}' in MODEL config`)
            continue
        }

        for (const modelName of entry.split(',').map(item => item.trim()).filter(Boolean)) {
            parsed.selectableModels.push(modelName)
        }
    }

    parsed.defaultModel = parsed.selectableModels[0] || resolveProfileModel('PADRAO', parsed.profileModels)
    return parsed
}

export function resolveProfileModel(requestedProfile: ModelProfileKey, profileModels: Partial<Record<ModelProfileKey, string>>): string | undefined {
    for (const profile of getModelProfileFallbackOrder(requestedProfile)) {
        const modelName = profileModels[profile]
        if (modelName) return modelName
    }
    return undefined
}

function parseOptionalNumber(value?: string): number | undefined {
    if (!value) return undefined
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : undefined
}

function parseSupportedFileTypes(value?: string): FileTypeEnum[] | undefined {
    if (!value) return undefined

    const fileTypes = new Set<FileTypeEnum>()
    const tokens = value.split('|').map(token => token.trim().toLowerCase()).filter(Boolean)

    for (const token of tokens) {
        if (token === 'pdf') {
            fileTypes.add(FileTypeEnum.PDF)
            continue
        }
        if (token === 'audio') {
            AUDIO_FILE_TYPES.forEach(type => fileTypes.add(type))
            continue
        }
        if (token === 'video') {
            VIDEO_FILE_TYPES.forEach(type => fileTypes.add(type))
            continue
        }

        const exactMatch = Object.values(FileTypeEnum).find(fileType => fileType.split('/').pop()?.toLowerCase() === token || fileType.toLowerCase() === token)
        if (exactMatch) fileTypes.add(exactMatch)
    }

    return fileTypes.size > 0 ? Array.from(fileTypes) : undefined
}

export function normalizeOpenRouterModelName(modelName: string): string {
    return modelName.startsWith('openrouter-') ? modelName : `openrouter-${modelName}`
}

export function normalizeOnPremisesModelName(modelName: string): string {
    return modelName.startsWith('onpremises-') ? modelName : `onpremises-${modelName}`
}

export function parseOnPremisesModels(modelsConfig?: string): ConfiguredModelValueType[] {
    if (!modelsConfig?.trim()) return []

    const parsedModels: ConfiguredModelValueType[] = []

    for (const entry of modelsConfig.split(';').map(item => item.trim()).filter(Boolean)) {
            const [rawModelName, inputTokenPPM, outputTokenPPM, cachedInputTokenPPM, clip, supportedFileTypes] = entry.split(',').map(part => part.trim())
            if (!rawModelName) continue

            parsedModels.push({
                name: normalizeOnPremisesModelName(rawModelName),
                provider: ModelProvider.ON_PREMISES,
                inputTokenPPM: parseOptionalNumber(inputTokenPPM),
                outputTokenPPM: parseOptionalNumber(outputTokenPPM),
                cachedInputTokenPPM: parseOptionalNumber(cachedInputTokenPPM),
                clip: parseOptionalNumber(clip),
                supportedFileTypes: parseSupportedFileTypes(supportedFileTypes),
            })
    }

    return parsedModels
}

export function parseOpenRouterModels(modelsConfig?: string): ConfiguredModelValueType[] {
    if (!modelsConfig?.trim()) return []

    const parsedModels: ConfiguredModelValueType[] = []

    for (const entry of modelsConfig.split(';').map(item => item.trim()).filter(Boolean)) {
            const [rawModelName, inputTokenPPM, outputTokenPPM, cachedInputTokenPPM, clip, supportedFileTypes] = entry.split(',').map(part => part.trim())
            if (!rawModelName) continue

            parsedModels.push({
                name: normalizeOpenRouterModelName(rawModelName),
                provider: ModelProvider.OPENROUTER,
                inputTokenPPM: parseOptionalNumber(inputTokenPPM),
                outputTokenPPM: parseOptionalNumber(outputTokenPPM),
                cachedInputTokenPPM: parseOptionalNumber(cachedInputTokenPPM),
                clip: parseOptionalNumber(clip),
                supportedFileTypes: parseSupportedFileTypes(supportedFileTypes),
            })
    }

    return parsedModels
}

export function getModelDetails(modelName: string, configuredModels?: string | ConfiguredModelValueType[]): ModelValueType | ConfiguredModelValueType | undefined {
    const staticModel = Object.values(Model).find(model => model.name === modelName)
    if (staticModel) return staticModel

    const parsedConfiguredModels = typeof configuredModels === 'string' ? parseOpenRouterModels(configuredModels) : configuredModels || []
    return parsedConfiguredModels.find(model => model.name === modelName)
}

// export const Model: ModelType = {
//     GPT_4_O_MINI_2024_07_18:
//         { sort: 1, id: 3, name: 'gpt-4o-mini-2024-07-18', provider: ModelProvider.OPENAI, status: StatusDeLancamento.PUBLICO },
//     GPT_4_O_2024_11_20:
//         { sort: 2, id: 7, name: 'gpt-4o-2024-11-20', provider: ModelProvider.OPENAI, status: StatusDeLancamento.PUBLICO },
//     GPT_4_O_2024_08_06:
//         { sort: 3, id: 1, name: 'gpt-4o-2024-08-06', provider: ModelProvider.OPENAI, status: StatusDeLancamento.PUBLICO },
//     CLAUDE_3_5_SONNET_20241022:
//         { sort: 4, id: 2, name: 'claude-3-5-sonnet-20241022', provider: ModelProvider.ANTHROPIC, status: StatusDeLancamento.PUBLICO },
//     GEMINI_1_5_PRO_002:
//         { sort: 5, id: 4, name: 'gemini-1.5-pro-002', provider: ModelProvider.GOOGLE, status: StatusDeLancamento.PUBLICO },
//     LLAMA_3_2_90B_TEXT_PREVIEW:
//         { sort: 6, id: 5, name: 'llama-3.2-90b-text-preview', provider: ModelProvider.GROQ, status: StatusDeLancamento.EM_DESENVOLVIMENTO },
//     LLAMA_3_1_70B_VERSATILE:
//         { sort: 7, id: 6, name: 'llama-3.1-70b-versatile', provider: ModelProvider.GROQ, status: StatusDeLancamento.EM_DESENVOLVIMENTO },
//     DEEPSEEK_CHAT:
//         { sort: 8, id: 8, name: 'deepseek-chat', provider: ModelProvider.DEEPSEEK, status: StatusDeLancamento.EM_DESENVOLVIMENTO },
//     // DEEPSEEK_REASONER:
//     //     { id: 9, name: 'deepseek-reasoner', provider: ModelProvider.DEEPSEEK }
// }

// export const ModelArray: ModelValeuType[] = [
//     { sort: 1, id: 3, name: 'gpt-4o-mini-2024-07-18', provider: ModelProvider.OPENAI },
//     { sort: 2, id: 7, name: 'gpt-4o-2024-11-20', provider: ModelProvider.OPENAI },
//     { sort: 3, id: 1, name: 'gpt-4o-2024-08-06', provider: ModelProvider.OPENAI },
//     { sort: 4, id: 2, name: 'claude-3-5-sonnet-20241022', provider: ModelProvider.ANTHROPIC },
//     { sort: 5, id: 4, name: 'gemini-1.5-pro-002', provider: ModelProvider.GOOGLE },
//     { sort: 6, id: 5, name: 'llama-3.2-90b-text-preview', provider: ModelProvider.GROQ },
//     { sort: 7, id: 6, name: 'llama-3.1-70b-versatile', provider: ModelProvider.GROQ },
//     { sort: 8, id: 8, name: 'deepseek-chat', provider: ModelProvider.DEEPSEEK },
//     // { id: 9, name: 'deepseek-reasoner', provider: ModelProvider.DEEPSEEK },
// ]

export function enumSortById(e: EnumOfObjectsType): any[] {
    const r: { key: string, value: EnumOfObjectsValueType }[] = Object.entries(e).map(([key, value]) => ({ key, value }))
    return r.sort((a, b) => a.value.id - b.value.id)
}

export function enumSorted(e: EnumOfObjectsType): any[] {
    const r: { key: string, value: EnumOfObjectsValueType }[] = Object.entries(e).map(([key, value]) => ({ key, value }))
    return r.sort((a, b) => a.value.sort - b.value.sort)
}

export type ModelUsageResult = {
    input_tokens: number, output_tokens: number, approximate_cost: number
}

export function modelCalcUsage(model: string, usage: UsageType, configuredModels?: string | ConfiguredModelValueType[]): ModelUsageResult {
    const modelDetails = getModelDetails(model, configuredModels)
    if(!modelDetails) {
    console.warn(`Model not found: ${model}, using default token costs.`)
}
const cachedInputTokenPPM = modelDetails?.cachedInputTokenPPM || modelDetails?.inputTokenPPM || 5
const inputTokenPPM = modelDetails?.inputTokenPPM || 5
const reasoningTokenPPM = modelDetails?.outputTokenPPM || 15
const outputTokenPPM = modelDetails?.outputTokenPPM || 15

const cachedInputTokens = usage.cachedInputTokens || 0
const reasoningTokens = usage.reasoningTokens || 0
const inputTokens = (usage.inputTokens || 0) - cachedInputTokens
const outputTokens = usage.outputTokens || 0

const approximate_cost = (reasoningTokens + outputTokens) > 0
    ? (cachedInputTokens * cachedInputTokenPPM
        + inputTokens * inputTokenPPM
        + reasoningTokens * reasoningTokenPPM
        + outputTokens * outputTokenPPM) / 1000000
    : (200000 * inputTokenPPM + 100000 * outputTokenPPM) / 1000000

devLog(`Using model: ${modelDetails?.name || model}, inputTokenPPM: ${inputTokenPPM}, outputTokenPPM: ${outputTokenPPM}`)
devLog('Cached input tokens:', cachedInputTokens)
devLog('Input tokens:', inputTokens)
devLog('Reasoning tokens:', reasoningTokens)
devLog('Output tokens:', outputTokens)
devLog(`Approximate cost: $${approximate_cost.toFixed(6)}`)
return { input_tokens: cachedInputTokens + inputTokens, output_tokens: reasoningTokens + outputTokens, approximate_cost }
}

