'use server'

import { FormState, fromErrorToFormState } from '@/lib/ui/form-state'
import { PromptDao } from '@/lib/db/dao'
import test from 'node:test'
import z, { ZodError } from 'zod'
import { IAPromptToInsert } from '@/lib/db/mysql-types'
import { Instance, Matter, Scope } from '@/lib/proc/process-types'
import { numericString } from '@/lib/ui/form-util'

// import { redirect } from 'next/navigation'
// redirect(`/posts/${data.id}`)

const promptSchema = z.object({
    // kind: z.string().min(1),
    base_id: numericString(z.number()).nullable().optional(),
    name: z.string().min(1),
    model_id: numericString(z.number()).nullable().optional(),
    testset_id: numericString(z.number()).nullable().optional(),
    share: z.string().nullable().optional(),
    created_by: numericString(z.number()).nullable().optional(),
    content: z.object({
        author: z.string().nullable().optional(),
        description: z.string().nullable().optional(),

        scope: z.string().array().nullable().optional(),
        instance: z.string().array().nullable().optional(),
        matter: z.string().array().nullable().optional(),

        target: z.string(),
        editor_label: z.string().nullable().optional(),
        piece_strategy: z.string().nullable().optional(),
        piece_descr: z.string().array().nullable().optional(),
        summary: z.string().nullable().optional(),

        profile: z.string().nullable().optional(),
        phase: z.string().array().nullable().optional(),

        group: z.object({
            slug: z.string(),
            title: z.string(),
            description: z.string(),
        }).nullable().optional(),
        
        sort: numericString(z.number()).nullable().optional(),
        batch_report: z.boolean().nullable().optional(),
        plugins: z.string().array().nullable().optional(),

        workflow: z.object({
            predecessors: z.array(z.object({
                uuid: z.string(),
                name: z.string().optional(),
                optional: z.boolean().optional(),
            })).optional(),
            successors: z.array(z.object({
                uuid: z.string(),
                name: z.string().optional(),
                optional: z.boolean().optional(),
            })).optional(),
        }).nullable().optional(),

        system_prompt: z.string().nullable().optional(),
        prompt: z.string().nullable().optional(),
        json_schema: z.string().nullable().optional(),
        format: z.string().nullable().optional(),

        template: z.string().nullable().optional()
    })
})

export const save = async (object: any) => {
    try {
        const data: IAPromptToInsert = promptSchema.parse(object) as any
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
