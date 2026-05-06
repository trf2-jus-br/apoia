"use server"

import devLog from '../utils/log'
import { EMPTY_PREFS_COOKIE } from '@/lib/utils/prefs-types'
import { assertCourtId, getCurrentUser } from '../user'
import { envStringPrefixed } from '../utils/env'
import { getPrefs } from '../utils/prefs'
import { getModelDetails, FileTypeEnum, modelCalcUsage, ModelUsageResult, parseOpenRouterModels, ConfiguredModelValueType, ModelProvider } from './model-types'
import { UsageType } from './prompt-types'

export async function getOpenRouterModelsFromPrefs(): Promise<string> {
    const prefs = await getPrefs()
    const user = await getCurrentUser()
    const seqTribunalPai = user ? '' + assertCourtId(user) : undefined
    const envKey = ModelProvider.OPENROUTER.models as string

    return prefs?.env?.[envKey] || envStringPrefixed(envKey, seqTribunalPai) || ''
}

export async function getConfiguredOpenRouterModelsFromPrefs(): Promise<ConfiguredModelValueType[]> {
    return parseOpenRouterModels(await getOpenRouterModelsFromPrefs())
}

async function getModelDetailsFromPrefs(modelName: string) {
    const configuredModels = await getConfiguredOpenRouterModelsFromPrefs()
    return getModelDetails(modelName, configuredModels)
}

export async function checkModelSupportsAudioVideo(modelName: string): Promise<boolean> {
    const details = await getModelDetailsFromPrefs(modelName)
    // devLog('Model details for', modelName, ':', details)

    const audioVideoTypes = [
        FileTypeEnum.MP3, FileTypeEnum.MP4, FileTypeEnum.WAV,
        FileTypeEnum.WMA, FileTypeEnum.WMV, FileTypeEnum.AIFF,
        FileTypeEnum.AAC, FileTypeEnum.OGG, FileTypeEnum.FLAC
    ]

    if (!details) {
        devLog('Model not found:', modelName)
        return false
    }

    if (!details.supportedFileTypes) {
        devLog('Model has no supportedFileTypes:', modelName)
        return false
    }

    const supports = audioVideoTypes.some(type => details.supportedFileTypes?.includes(type))
    devLog('Model supports audio/video:', supports)

    return supports
}

export async function checkModelSupportsPdf(modelName: string): Promise<boolean> {
    const details = await getModelDetailsFromPrefs(modelName)
    return !!details?.supportedFileTypes?.includes(FileTypeEnum.PDF)
}

export async function getModelClipLimit(modelName: string): Promise<number | undefined> {
    return (await getModelDetailsFromPrefs(modelName))?.clip
}

export async function calculateModelUsage(modelName: string, usage: UsageType): Promise<ModelUsageResult> {
    const configuredModels = await getConfiguredOpenRouterModelsFromPrefs()
    return modelCalcUsage(modelName, usage, configuredModels)
}