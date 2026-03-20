import { enumSorted, Model } from '@/lib/ai/model-types'
import { getSelectedModelParams } from '@/lib/ai/model-server'
import { withErrorHandler } from '@/lib/utils/api-error'

async function GET_HANDLER() {
    const { model, availableApiKeys, selectableModels } = await getSelectedModelParams()

    const availableModels = enumSorted(Model)
        .filter((m) => !selectableModels || selectableModels.includes(m.value.name))
        .map((m) => m.value.name)

    return Response.json({
        model,
        availableApiKeys,
        availableModels,
    })
}

export const GET = withErrorHandler(GET_HANDLER as any)
