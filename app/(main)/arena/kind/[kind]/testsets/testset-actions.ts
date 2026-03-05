'use server'

import { fromErrorToFormState } from '@/lib/ui/form-state'
import { TestsetDao } from '@/lib/db/dao'
import z from 'zod'
import { numericString } from '@/lib/ui/form-util'

// import { redirect } from 'next/navigation'
// redirect(`/posts/${data.id}`)

const testsetSchema = z.object({
    kind: z.string().min(1),
    name: z.string().min(1),
    model_id: numericString(z.number()),
    content: z.object({
        tests: z.array(z.object({
            name: z.string().min(1),
            texts: z.array(z.object({
                name: z.string().min(1),
                value: z.string().min(1)
            })),
            variables: z.array(z.object({
                name: z.string().min(1),
                value: z.string().min(1)
            })),
            expected: z.string().min(1),
            questions: z.array(z.object({
                question: z.string().min(1)
            }))
        })
        )
    })
})

export const save = async (object: any) => {
    try {
        const data = testsetSchema.parse(object)
        await TestsetDao.insertIATestset(data as any)
        return { status: 'SUCCESS', message: 'success' }
    } catch (error) {
        return fromErrorToFormState(error)
    }
}

export const setOfficial = async (id: number) => {
    try {
        await TestsetDao.setOfficialTestset(id)
        return { status: 'SUCCESS', message: 'success' }
    } catch (error) {
        return fromErrorToFormState(error)
    }
}

export const removeOfficial = async (id: number) => {
    try {
        await TestsetDao.removeOfficialTestset(id)
        return { status: 'SUCCESS', message: 'success' }
    } catch (error) {
        return fromErrorToFormState(error)
    }
}

export const getTestsetById = async (id: number) => {
    return await TestsetDao.retrieveTestsetById(id)
}