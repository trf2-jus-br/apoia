import { StatusDeLancamento } from "../proc/process-types"
import { slugify } from "../utils/utils"

// Tipos de arquivos que podem ser suportados diretamente por modelos
export enum FileTypeEnum {
    PDF = 'application/pdf',
}

export type EnumOfObjectsValueType = { id: number, name: string, sort: number }
export type EnumOfObjectsType = { [key: string]: EnumOfObjectsValueType }

const ModelProviderArray = [
    { id: 2, name: 'OpenAI', apiKey: 'OPENAI_API_KEY', apiKeyRegex: /^sk-proj-[a-zA-Z0-9_]{48,164}$/, status: StatusDeLancamento.PUBLICO },
    { id: 1, name: 'Anthropic', apiKey: 'ANTHROPIC_API_KEY', apiKeyRegex: /^sk-[a-zA-Z0-9_-]{100,110}$/, status: StatusDeLancamento.PUBLICO },
    { id: 3, name: 'Google', apiKey: 'GOOGLE_API_KEY', apiKeyRegex: /^AI[a-zA-Z0-9]{37}$/, status: StatusDeLancamento.PUBLICO },
    { id: 4, name: 'Azure', apiKey: 'AZURE_API_KEY', resourceName: 'AZURE_RESOURCE_NAME', apiKeyRegex: /^[a-zA-Z0-9]{32,84}$/, status: StatusDeLancamento.PUBLICO },
    { id: 7, name: 'AWS', apiKey: 'AWS_SECRET_ACCESS_KEY', accessKeyId: 'AWS_ACCESS_KEY_ID', region: 'AWS_REGION', apiKeyRegex: /^sk-[a-zA-Z0-9]{32}$/, status: StatusDeLancamento.PUBLICO },
    { id: 5, name: 'Groq', apiKey: 'GROQ_API_KEY', apiKeyRegex: /^gsk_[a-zA-Z0-9]{52}$/, status: StatusDeLancamento.EM_DESENVOLVIMENTO },
    { id: 6, name: 'DeepSeek', apiKey: 'DEEPSEEK_API_KEY', apiKeyRegex: /^sk-[a-zA-Z0-9]{32}$/, status: StatusDeLancamento.EM_DESENVOLVIMENTO },
]

export type ModelProviderValueType = EnumOfObjectsValueType & { apiKey: string, resourceName?: string, region?: string, accessKeyId?: string, apiKeyRegex: RegExp, status: StatusDeLancamento }
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
    inputTokenPPM: number
    outputTokenPPM: number
    status: StatusDeLancamento
    clip?: number
    supportedFileTypes?: FileTypeEnum[]
}

const ModelArray: ModelArrayType[] = [
    { id: 16, name: 'gpt-5-mini', provider: ModelProvider.OPENAI, inputTokenPPM: 0.25, outputTokenPPM: 2, status: StatusDeLancamento.PUBLICO },
    { id: 17, name: 'gpt-5-nano', provider: ModelProvider.OPENAI, inputTokenPPM: 0.05, outputTokenPPM: 0.4, status: StatusDeLancamento.PUBLICO },
    { id: 15, name: 'gpt-5', provider: ModelProvider.OPENAI, inputTokenPPM: 1.25, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO },
    { id: 16, name: 'gpt-4.1-mini', provider: ModelProvider.OPENAI, inputTokenPPM: 0.4, outputTokenPPM: 1.6, status: StatusDeLancamento.PUBLICO, clip: 1000, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 17, name: 'gpt-4.1-nano', provider: ModelProvider.OPENAI, inputTokenPPM: 0.1, outputTokenPPM: 0.4, status: StatusDeLancamento.PUBLICO, clip: 1000, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 15, name: 'gpt-4.1', provider: ModelProvider.OPENAI, inputTokenPPM: 2, outputTokenPPM: 8, status: StatusDeLancamento.PUBLICO, clip: 1000, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 3, name: 'gpt-4o-mini-2024-07-18', provider: ModelProvider.OPENAI, inputTokenPPM: 0.15, outputTokenPPM: 0.6, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 7, name: 'gpt-4o-2024-11-20', provider: ModelProvider.OPENAI, inputTokenPPM: 2.5, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 1, name: 'gpt-4o-2024-08-06', provider: ModelProvider.OPENAI, inputTokenPPM: 2.5, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 22, name: 'claude-sonnet-4-20250514', provider: ModelProvider.ANTHROPIC, inputTokenPPM: 3, outputTokenPPM: 15, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 13, name: 'claude-3-7-sonnet-20250219', provider: ModelProvider.ANTHROPIC, inputTokenPPM: 3, outputTokenPPM: 15, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 2, name: 'claude-3-5-sonnet-20241022', provider: ModelProvider.ANTHROPIC, inputTokenPPM: 3, outputTokenPPM: 15, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 14, name: 'claude-3-5-haiku-20241022', provider: ModelProvider.ANTHROPIC, inputTokenPPM: 0.8, outputTokenPPM: 4, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 18, name: 'gemini-2.5-flash', provider: ModelProvider.GOOGLE, inputTokenPPM: 0.30, outputTokenPPM: 2.5, status: StatusDeLancamento.PUBLICO, clip: 1000, supportedFileTypes: [FileTypeEnum.PDF] },
    // { id: 9, name: 'gemini-2.0-flash', provider: ModelProvider.GOOGLE, inputTokenPPM: 0.1, outputTokenPPM: 0.4, status: StatusDeLancamento.PUBLICO },
    { id: 10, name: 'gemini-2.5-pro', provider: ModelProvider.GOOGLE, inputTokenPPM: 2.5, outputTokenPPM: 15, status: StatusDeLancamento.PUBLICO, clip: 1000, supportedFileTypes: [FileTypeEnum.PDF] },
    // { id: 4, name: 'gemini-1.5-pro-002', provider: ModelProvider.GOOGLE, inputTokenPPM: 2.5, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO },
    { id: 5, name: 'llama-3.2-90b-text-preview', provider: ModelProvider.GROQ, inputTokenPPM: 1, outputTokenPPM: 1, status: StatusDeLancamento.EM_DESENVOLVIMENTO },
    { id: 6, name: 'llama-3.1-70b-versatile', provider: ModelProvider.GROQ, inputTokenPPM: 1, outputTokenPPM: 1, status: StatusDeLancamento.EM_DESENVOLVIMENTO },
    { id: 8, name: 'deepseek-chat', provider: ModelProvider.DEEPSEEK, inputTokenPPM: 0.27, outputTokenPPM: 1.1, status: StatusDeLancamento.EM_DESENVOLVIMENTO },
    // { id: 19, name: 'azure-gpt-5-mini', provider: ModelProvider.AZURE, inputTokenPPM: 0.25, outputTokenPPM: 2, status: StatusDeLancamento.PUBLICO },
    // { id: 20, name: 'azure-gpt-5-nano', provider: ModelProvider.AZURE, inputTokenPPM: 0.05, outputTokenPPM: 0.4, status: StatusDeLancamento.PUBLICO },
    // { id: 21, name: 'azure-gpt-5', provider: ModelProvider.AZURE, inputTokenPPM: 1.25, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO },
    // { id: 21, name: 'azure-gpt-5-chat', provider: ModelProvider.AZURE, inputTokenPPM: 1.25, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO },
    { id: 19, name: 'azure-gpt-4.1-mini', provider: ModelProvider.AZURE, inputTokenPPM: 0.4, outputTokenPPM: 1.6, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 20, name: 'azure-gpt-4.1-nano', provider: ModelProvider.AZURE, inputTokenPPM: 0.1, outputTokenPPM: 0.4, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 21, name: 'azure-gpt-4.1', provider: ModelProvider.AZURE, inputTokenPPM: 2, outputTokenPPM: 8, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 11, name: 'azure-gpt-4o', provider: ModelProvider.AZURE, inputTokenPPM: 2.5, outputTokenPPM: 10, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 12, name: 'azure-gpt-4o-mini', provider: ModelProvider.AZURE, inputTokenPPM: 0.15, outputTokenPPM: 0.6, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    // { id: 22, name: 'aws-anthropic.claude-3-haiku-20240307-v1:0', provider: ModelProvider.AWS, status: StatusDeLancamento.PUBLICO },
    { id: 22, name: 'aws-us.anthropic.claude-3-5-haiku-20241022-v1:0', provider: ModelProvider.AWS, inputTokenPPM: 0.8, outputTokenPPM: 4, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
    { id: 22, name: 'aws-us.anthropic.claude-sonnet-4-20250514-v1:0', provider: ModelProvider.AWS, inputTokenPPM: 3, outputTokenPPM: 15, status: StatusDeLancamento.PUBLICO, supportedFileTypes: [FileTypeEnum.PDF] },
]

export type ModelValeuType = EnumOfObjectsValueType & { provider: ModelProviderValueType, inputTokenPPM: number, outputTokenPPM: number, status: StatusDeLancamento, clip?: number, supportedFileTypes?: FileTypeEnum[] }
export type ModelType = { [key: string]: ModelValeuType }

export const Model: ModelType = ModelArray.reduce((acc, cur, idx) => {
    acc[slugify(cur.name).replaceAll('-', '_').toUpperCase()] = { ...cur, sort: idx + 1 }
    return acc
}, {} as ModelType)

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

export function modelCalcUsage(model: string, input_tokens: number, output_tokens: number): { input_tokens: number, output_tokens: number, approximate_cost: number } {
    const modelDetails: ModelValeuType = Object.values(Model).find(m => m.name === model)
    if (!modelDetails) {
        console.warn(`Model not found: ${model}, using default token costs.`)
    }
    const inputTokenPPM = modelDetails?.inputTokenPPM || 5
    const outputTokenPPM = modelDetails?.outputTokenPPM || 15
    const approximate_cost = Number.isFinite(input_tokens) && Number.isFinite(output_tokens)
        ? (input_tokens * inputTokenPPM + output_tokens * outputTokenPPM) / 1000000
        : (200000 * inputTokenPPM + 100000 * outputTokenPPM) / 1000000

    console.log(`Using model: ${modelDetails.name}, inputTokenPPM: ${inputTokenPPM}, outputTokenPPM: ${outputTokenPPM}`)
    console.log('Input tokens:', input_tokens)
    console.log('Output tokens:', output_tokens)
    console.log(`Approximate cost: $${approximate_cost.toFixed(6)}`)
    return { input_tokens, output_tokens, approximate_cost }
}

