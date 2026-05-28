'use server'

import { redirect } from "next/navigation"
import { acceptSelectableModel, enumSortById, enumSorted, getSelectableModelsForApiKey, mergeSelectableModelLists, Model, ModelProfileKey, ModelProvider, ModelProviderType, ModelProviderValueType, parseModelConfig, parseOnPremisesModels, parseOpenRouterModels, resolveProfileModel } from "./model-types"
import { getPrefs } from "../utils/prefs"
import { envStringPrefixed, getEnvStringPrefixedIfUserIsAllowed } from "../utils/env"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createAzure } from "@ai-sdk/azure"
import { createGroq } from "@ai-sdk/groq"
import { createDeepSeek } from "@ai-sdk/deepseek"
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { EMPTY_PREFS_COOKIE, PrefsCookieType } from '@/lib/utils/prefs-types'
import { assertCourtId, getCurrentUser } from "../user"
import { LanguageModelV3 } from "@ai-sdk/provider"
import devLog from "../utils/log"
import { getConfiguredOpenRouterModelsFromPrefs, getConfiguredOnPremisesModelsFromPrefs, getOpenRouterModelsFromPrefs, getOnPremisesModelsFromPrefs } from "./model-metadata-server"

function resolveModelSelection(params: { overrideModel?: string, profile?: ModelProfileKey }, selectedModel: string | undefined, tribunalConfig: string | undefined, forceModelInAllSituations?: boolean): string | undefined {
    const { overrideModel, profile } = params
    if (forceModelInAllSituations && selectedModel) return selectedModel

    if (overrideModel) return overrideModel
    if (!profile) return selectedModel

    if (profile === 'PADRAO') return selectedModel

    const parsedConfig = parseModelConfig(tribunalConfig)
    const resolvedModel = resolveProfileModel(profile, parsedConfig.profileModels) || selectedModel
    devLog(`Resolved model for profile ${profile}: ${resolvedModel} (selectedModel: ${selectedModel})`)
    return resolvedModel
}

function getEnvKeyByModel(model: string): string {
    if (!model) throw new Error('Model is required')
    if (model.startsWith('claude-')) {
        return ModelProvider.ANTHROPIC.apiKey
    } else if (model.startsWith('gpt-')) {
        return ModelProvider.OPENAI.apiKey
    } else if (model.startsWith('gemini-')) {
        return ModelProvider.GOOGLE.apiKey
    } else if (model.startsWith('azure-')) {
        return ModelProvider.AZURE.apiKey
    } else if (model.startsWith('aws-')) {
        return ModelProvider.AWS.apiKey
    } else if (model.startsWith('llama-')) {
        return ModelProvider.GROQ.apiKey
    } else if (model.startsWith('deepseek-')) {
        return ModelProvider.DEEPSEEK.apiKey
    } else if (model.startsWith('openrouter-')) {
        return ModelProvider.OPENROUTER.apiKey
    } else if (model.startsWith('onpremises-')) {
        return ModelProvider.ON_PREMISES.apiKey
    }
    throw new Error('Invalid model')
}

function getApiKeyByModel(model: string, prefs: PrefsCookieType, seqTribunalPai?: string): string {
    const envKey = getEnvKeyByModel(model)
    let s = prefs?.env[envKey]
    if (s) return s
    const s2 = envStringPrefixed(envKey, seqTribunalPai)
    if (s2) return s2
    throw new Error(`API Key ${envKey} not found for model ${model}`)
}

export const assertModel = async () => {
    if (!(await getSelectedModelName())) {
        redirect('/prefs')
    }
}

export type ModelParams = { model: string, apiKey: string, availableApiKeys: string[], apiKeyFromEnv: boolean, defaultModel?: string, selectableModels?: string[], availableSelectableModels?: string[], userMayChangeModel: boolean, forceModelInAllSituations: boolean, azureResourceName: string, onPremisesUrl?: string, awsRegion?: string, awsAccessKeyId?: string, openRouterModels?: string, onPremisesModels?: string }
export async function getSelectedModelParams(): Promise<ModelParams> {
    const prefs = await getPrefs()
    const user = await getCurrentUser()
    const seqTribunalPai = user ? '' + (assertCourtId(user)) : undefined

    let model: string
    let azureResourceName: string
    let onPremisesUrl: string
    let awsRegion: string
    let awsAccessKeyId: string
    let openRouterModels: string
    let onPremisesModels: string
    const forceModelInAllSituations = !!prefs?.useModelInAllSituations

    const tribunalModelConfig = getEnvStringPrefixedIfUserIsAllowed(user?.preferredUsername, 'MODEL', seqTribunalPai) as string
    const parsedModelConfig = parseModelConfig(tribunalModelConfig)
    let defaultModel = parsedModelConfig.defaultModel
    const selectableModels = parsedModelConfig.selectableModels.length > 0 ? parsedModelConfig.selectableModels : undefined
    const userMayChangeModel = !!selectableModels?.length

    azureResourceName = getEnvStringPrefixedIfUserIsAllowed(user?.preferredUsername, ModelProvider.AZURE.resourceName, seqTribunalPai) as string
    onPremisesUrl = getEnvStringPrefixedIfUserIsAllowed(user?.preferredUsername, ModelProvider.ON_PREMISES.resourceName, seqTribunalPai) as string
    awsRegion = getEnvStringPrefixedIfUserIsAllowed(user?.preferredUsername, ModelProvider.AWS.region, seqTribunalPai) as string
    awsAccessKeyId = getEnvStringPrefixedIfUserIsAllowed(user?.preferredUsername, ModelProvider.AWS.accessKeyId, seqTribunalPai) as string
    openRouterModels = await getOpenRouterModelsFromPrefs()
    onPremisesModels = await getOnPremisesModelsFromPrefs()

    const configuredOpenRouterModels = parseOpenRouterModels(openRouterModels)
    const configuredOnPremisesModels = parseOnPremisesModels(onPremisesModels)
    const availableSelectableModels = mergeSelectableModelLists(
        selectableModels,
        defaultModel ? [defaultModel] : undefined,
        ...Object.values(ModelProvider)
            .filter(provider => !!prefs?.env?.[provider.apiKey])
            .map(provider => getSelectableModelsForApiKey(provider.apiKey, configuredOpenRouterModels, configuredOnPremisesModels)),
    )

    model = acceptSelectableModel(prefs?.model, availableSelectableModels)
    if (prefs?.model && !model) {
        devLog(`Ignoring unavailable preferred model: ${prefs.model}`)
    }
    if (prefs?.env[ModelProvider.AZURE.resourceName]) azureResourceName = prefs.env[ModelProvider.AZURE.resourceName]
    if (prefs?.env[ModelProvider.ON_PREMISES.resourceName]) onPremisesUrl = prefs.env[ModelProvider.ON_PREMISES.resourceName]
    if (prefs?.env[ModelProvider.AWS.region]) awsRegion = prefs.env[ModelProvider.AWS.region]
    if (prefs?.env[ModelProvider.AWS.accessKeyId]) awsAccessKeyId = prefs.env[ModelProvider.AWS.accessKeyId]

    if (!model) model = defaultModel

    const availableApiKeys = Object.values(ModelProvider).filter((model) => getEnvStringPrefixedIfUserIsAllowed(user?.preferredUsername, model.apiKey, seqTribunalPai)).map((model) => model.apiKey)

    let apiKey: string
    if (model) {
        try {
            apiKey = getApiKeyByModel(model, prefs || EMPTY_PREFS_COOKIE, seqTribunalPai)
        } catch (e) {
            devLog(`Error getting API key for model ${model}`)
            apiKey = undefined
            model = undefined
        }
    }
    if (!model) {
        // try to find an available api key
        let provider: ModelProviderValueType
        for (const p of enumSortById(ModelProvider)) {
            provider = p.value
            apiKey = getEnvStringPrefixedIfUserIsAllowed(user?.preferredUsername, p.value.apiKey, seqTribunalPai)
            if (apiKey) break
            apiKey = prefs?.env[p.value.apiKey]
            if (apiKey) break
        }
        // try to find a model for the api key
        if (apiKey) {
            if (provider.apiKey === ModelProvider.OPENROUTER.apiKey) {
                if (configuredOpenRouterModels.length > 0) {
                    model = configuredOpenRouterModels[0].name
                }
            }
            if (provider.apiKey === ModelProvider.ON_PREMISES.apiKey) {
                if (configuredOnPremisesModels.length > 0) {
                    model = configuredOnPremisesModels[0].name
                }
            }
            for (const m of enumSorted(Model)) {
                if (m.value.provider.apiKey === provider.apiKey) {
                    model = m.value.name
                    break
                }
            }
        }
    }

    let apiKeyFromEnv: boolean = false
    if (model) {
        const envKey = getEnvKeyByModel(model)
        apiKeyFromEnv = apiKey === getEnvStringPrefixedIfUserIsAllowed(user?.preferredUsername, envKey, seqTribunalPai)
    }
    return { model, apiKey, availableApiKeys, apiKeyFromEnv, defaultModel, selectableModels, availableSelectableModels, userMayChangeModel, forceModelInAllSituations, azureResourceName, onPremisesUrl, awsRegion, awsAccessKeyId, openRouterModels, onPremisesModels }
}

export async function getSelectedModelName(): Promise<string> {
    return (await getSelectedModelParams()).model
}

export async function getModel(params?: { structuredOutputs: boolean, overrideModel?: string, profile?: ModelProfileKey }): Promise<{ model: string, modelRef: LanguageModelV3, apiKeyFromEnv: boolean }> {
    let { model, apiKey, azureResourceName, onPremisesUrl, awsRegion, awsAccessKeyId, apiKeyFromEnv, forceModelInAllSituations } = await getSelectedModelParams()
    const user = await getCurrentUser()
    const seqTribunalPai = user ? '' + (assertCourtId(user)) : undefined
    const tribunalModelConfig = getEnvStringPrefixedIfUserIsAllowed(user?.preferredUsername, 'MODEL', seqTribunalPai) as string
    model = resolveModelSelection({ overrideModel: params?.overrideModel, profile: params?.profile }, model, tribunalModelConfig, forceModelInAllSituations)

    if (!model) throw new Error('Nenhum modelo de IA configurado. Por favor, acesse /prefs para configurar um modelo.')


    if (getEnvKeyByModel(model) === ModelProvider.ANTHROPIC.apiKey) {
        const anthropic = createAnthropic({ apiKey })
        return { model, modelRef: anthropic(model), apiKeyFromEnv }
    }
    if (getEnvKeyByModel(model) === ModelProvider.OPENAI.apiKey) {
        const openai = createOpenAI({
            apiKey
        })
        return { model, modelRef: openai(model) as unknown as LanguageModelV3, apiKeyFromEnv }
    }
    if (getEnvKeyByModel(model) === ModelProvider.ON_PREMISES.apiKey) {
        const openai = createOpenAI({
            apiKey,
            baseURL: onPremisesUrl
        })
        return { model, modelRef: openai(model.replace('onpremises-', '')) as unknown as LanguageModelV3, apiKeyFromEnv }
    }
    if (getEnvKeyByModel(model) === ModelProvider.GOOGLE.apiKey) {
        const google = createGoogleGenerativeAI({ apiKey })
        return { model, modelRef: google(model), apiKeyFromEnv }
    }
    if (getEnvKeyByModel(model) === ModelProvider.AZURE.apiKey) {
        const azure = azureResourceName?.startsWith('https')
            ? createAzure({ apiKey, baseURL: azureResourceName })
            : createAzure({ apiKey, resourceName: azureResourceName })
        return { model, modelRef: azure(model.replace('azure-', '')) as unknown as LanguageModelV3, apiKeyFromEnv }
    }
    if (getEnvKeyByModel(model) === ModelProvider.AWS.apiKey) {
        const bedrock = createAmazonBedrock({ region: awsRegion, accessKeyId: awsAccessKeyId, secretAccessKey: apiKey })
        const modelRef = bedrock(model.replace('aws-', '')) as unknown as LanguageModelV3
        return { model, modelRef, apiKeyFromEnv }
    }
    if (getEnvKeyByModel(model) === ModelProvider.GROQ.apiKey) {
        const groq = createGroq({ apiKey })
        return { model, modelRef: groq(model), apiKeyFromEnv }
    }
    if (getEnvKeyByModel(model) === ModelProvider.DEEPSEEK.apiKey) {
        const deepseek = createDeepSeek({ apiKey })
        return { model, modelRef: deepseek(model), apiKeyFromEnv }
    }
    if (getEnvKeyByModel(model) === ModelProvider.OPENROUTER.apiKey) {
        const openrouter = createOpenRouter({ apiKey })
        return { model, modelRef: openrouter(model.replace('openrouter-', '')) as unknown as LanguageModelV3, apiKeyFromEnv }
    }
    throw new Error(`Model ${model} not found`)
}


