'use server'

import { FormState, fromErrorToFormState, numericString } from '@/lib/ui/form-support'
import { Dao } from '@/lib/db/mysql'
import test from 'node:test'
import z, { ZodError } from 'zod'

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
        await Dao.insertIAPrompt(null, data as any)
        return { status: 'SUCCESS', message: 'success' }
    } catch (error) {
        return fromErrorToFormState(error)
    }
}

export const setOfficial = async (id: number) => {
    try {
        await Dao.setOfficialPrompt(id)
        return { status: 'SUCCESS', message: 'success' }
    } catch (error) {
        return fromErrorToFormState(error)
    }
}

export const removeOfficial = async (id: number) => {
    try {
        await Dao.removeOfficialPrompt(id)
        return { status: 'SUCCESS', message: 'success' }
    } catch (error) {
        return fromErrorToFormState(error)
    }
}
