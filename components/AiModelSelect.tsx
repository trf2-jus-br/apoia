'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { Form } from 'react-bootstrap'
import { enumSorted, Model } from '@/lib/ai/model-types'
import { StatusDeLancamento } from '@/lib/proc/process-types'

type SelectModelOption = {
    id: string
    name: string
    disabled: boolean
}

type AiModelSelectProps = {
    statusDeLancamento?: StatusDeLancamento
    label?: string
    name?: string
    placeholder?: string
}

type AvailableModelsResponse = {
    model?: string
    availableApiKeys: string[]
    availableModels?: string[]
}

type PrefsCookie = {
    model?: string
    env?: Record<string, string>
}

function getCookieValue(name: string): string | undefined {
    if (typeof document === 'undefined') return undefined

    const prefix = `${name}=`
    const parts = document.cookie.split(';')
    for (const part of parts) {
        const cookie = part.trim()
        if (cookie.startsWith(prefix)) {
            return cookie.slice(prefix.length)
        }
    }

    return undefined
}

function readPrefsCookie(): PrefsCookie {
    try {
        const cookieValue = getCookieValue('prefs')
        if (!cookieValue) return { env: {} }

        const decoded = atob(cookieValue)
        const parsed = JSON.parse(decoded) as PrefsCookie
        return {
            model: parsed?.model,
            env: parsed?.env || {},
        }
    } catch {
        return { env: {} }
    }
}

function persistSelectedModel(model: string) {
    const prefs = readPrefsCookie()
    const updatedPrefs: PrefsCookie = {
        ...prefs,
        model,
        env: prefs.env || {},
    }

    const cookie = btoa(JSON.stringify(updatedPrefs))
    document.cookie = `prefs=${cookie}; path=/;`
}

export function getAvailableApiKeys(params?: {
    env?: Record<string, string | undefined>
    availableApiKeys?: string[]
}): string[] {
    const envApiKeys = Object.entries(params?.env || {})
        .filter(([, value]) => !!value)
        .map(([key]) => key)

    return Array.from(new Set([...(params?.availableApiKeys || []), ...envApiKeys]))
}

export function AiModelSelect({
    statusDeLancamento = StatusDeLancamento.PUBLICO,
    label = 'Modelo de IA',
    name = 'model',
    placeholder = '[Selecionar]'
}: AiModelSelectProps) {
    const [value, setValue] = useState('')
    const [availableApiKeys, setAvailableApiKeys] = useState<string[]>([])
    const [availableModels, setAvailableModels] = useState<string[] | undefined>(undefined)

    useEffect(() => {
        let isMounted = true

        const loadAvailableModels = async () => {
            try {
                const response = await fetch('/api/ai/model-options', { cache: 'no-store' })
                if (!response.ok) return

                const data = (await response.json()) as AvailableModelsResponse
                if (!isMounted) return

                setAvailableApiKeys(data.availableApiKeys || [])
                setAvailableModels(data.availableModels)
                setValue(data.model || '')
            } catch (error) {
                console.error('Erro ao carregar modelos de IA disponiveis', error)
            }
        }

        loadAvailableModels()

        return () => {
            isMounted = false
        }
    }, [])

    const modelOptions = useMemo(() => {
        return enumSorted(Model)
            .filter((m) => statusDeLancamento >= m.value.provider.status)
            .filter((m) => !availableModels || availableModels.includes(m.value.name))
            .map((m) => {
                const isEnabled = availableApiKeys.length === 0 || availableApiKeys.includes(m.value.provider.apiKey)
                return {
                    id: m.value.name,
                    name: m.value.name,
                    disabled: !isEnabled,
                }
            })
            .sort((a, b) => (a.disabled === b.disabled ? 0 : a.disabled ? 1 : -1))
    }, [availableApiKeys, availableModels, statusDeLancamento])

    const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const selectedModel = event.target.value
        setValue(selectedModel)
        persistSelectedModel(selectedModel)
    }

    return (
        <Form.Group 
            className="d-flex flex-column flex-md-row gap-2" 
            controlId={name} 
            style={{ minWidth: '300px', height: 'min-content', marginBottom: 'auto', marginTop: 'auto' }}
        >
            <Form.Label style={{ whiteSpace: 'nowrap', marginTop: 'auto', marginBottom: 'auto' }}>{label}</Form.Label>
            <Form.Select name={name} value={value} onChange={handleChange}>
                <option value="">{placeholder}</option>
                {modelOptions.map((option) => (
                    <option key={option.id} value={option.id} disabled={option.disabled} style={{ display: option.disabled ? 'none' : 'block' }}>
                        {option.name}
                    </option>
                ))}
            </Form.Select>
        </Form.Group>
    )
}