'use server'

import { FormState, fromErrorToFormState } from '@/lib/ui/form-state'
import { PromptDao, TestDao } from '@/lib/db/dao'
import { assertCurrentUser } from '@/lib/user'
import test from 'node:test'
import z, { ZodError } from 'zod'
import { numericString } from '@/lib/ui/form-util'

// import { redirect } from 'next/navigation'
// redirect(`/posts/${data.id}`)

const promptSchema = z.object({
    kind: z.string().min(1),
    name: z.string().min(1),
    model_id: numericString(z.number()),
    testset_id: numericString(z.number()).nullable(),
    content: z.object({
        system_prompt: z.string().nullable().optional(),
        prompt: z.string().min(1),
        json_schema: z.string().nullable().optional(),
        format: z.string().nullable().optional()
    })
})

export const save = async (object: any) => {
    try {
        const data = promptSchema.parse(object)
        await PromptDao.insertIAPrompt(null, data as any)
        return { status: 'SUCCESS', message: 'success' }
    } catch (error) {
        return fromErrorToFormState(error)
    }
}

export const loadRanking = async (kind: string, testset_id: number, prompt_id?: number, model_id?: number) => {
    await assertCurrentUser()
    const ranking = await TestDao.retrieveRanking(kind, testset_id, prompt_id, model_id)
    return ranking
}

export const removeOfficial = async (id: number) => {
    try {
        await PromptDao.removeOfficialPrompt(id)
        return { status: 'SUCCESS', message: 'success' }
    } catch (error) {
        return fromErrorToFormState(error)
    }
}
