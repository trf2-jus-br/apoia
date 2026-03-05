'use server'

import { FormState, fromErrorToFormState } from '@/lib/ui/form-state'
import { PromptDao } from '@/lib/db/dao'
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

export const setOfficial = async (id: number) => {
    try {
        await PromptDao.setOfficialPrompt(id)
        return { status: 'SUCCESS', message: 'success' }
    } catch (error) {
        return fromErrorToFormState(error)
    }
}

export const removeOfficial = async (id: number) => {
    try {
        await PromptDao.removeOfficialPrompt(id)
        return { status: 'SUCCESS', message: 'success' }
    } catch (error) {
        return fromErrorToFormState(error)
    }
}
