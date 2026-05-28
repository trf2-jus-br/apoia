import { getAlternativeDefaultProfileFallbackOrder, getModelProfileFallbackOrder, parseModelConfig, resolveAlternativeDefaultProfileModel, resolveProfileModel } from '@/lib/ai/model-types'

describe('model profile config', () => {
    test('parses mixed selectable and profile models', () => {
        const parsed = parseModelConfig('gemini-3.1-flash-lite;gemini-3.1-pro;EFICIENTE:gemini-3.1-flash-lite;EFICIENTE_MP3:gemini-2.5-flash-lite')

        expect(parsed.selectableModels).toEqual(['gemini-3.1-flash-lite', 'gemini-3.1-pro'])
        expect(parsed.defaultModel).toBe('gemini-3.1-flash-lite')
        expect(parsed.profileModels.EFICIENTE).toBe('gemini-3.1-flash-lite')
        expect(parsed.profileModels.EFICIENTE_MP3).toBe('gemini-2.5-flash-lite')
    })

    test('allows tribunal config with profiles only', () => {
        const parsed = parseModelConfig('PADRAO_MP3_PDF:gemini-3.1-flash-lite')

        expect(parsed.selectableModels).toEqual([])
        expect(parsed.defaultModel).toBe('gemini-3.1-flash-lite')
        expect(parsed.profileModels.PADRAO_MP3_PDF).toBe('gemini-3.1-flash-lite')
    })

    test('uses alternative default profile order when PADRAO is not configured', () => {
        const parsed = parseModelConfig('EFICIENTE_MP3:gemini-2.5-flash-lite;PREMIUM:gemini-3.1-pro-preview')

        expect(parsed.selectableModels).toEqual([])
        expect(parsed.defaultModel).toBe('gemini-2.5-flash-lite')
        expect(parsed.profileModels.EFICIENTE_MP3).toBe('gemini-2.5-flash-lite')
    })

    test('supports aws model names with colon as selectable models', () => {
        const parsed = parseModelConfig('aws-us.anthropic.claude-sonnet-4-20250514-v1:0;EFICIENTE:gemini-3.1-flash-lite')

        expect(parsed.selectableModels).toEqual(['aws-us.anthropic.claude-sonnet-4-20250514-v1:0'])
        expect(parsed.profileModels.EFICIENTE).toBe('gemini-3.1-flash-lite')
    })

    test('ignores invalid legacy profile names', () => {
        const parsed = parseModelConfig('BAIXO_AUDIO:gemini-2.5-flash-lite;ALTO:gemini-3.1-pro-preview;gemini-3-pro')

        expect(parsed.profileModels).toEqual({})
        expect(parsed.selectableModels).toEqual(['gemini-3-pro'])
    })
})

describe('model profile fallback', () => {
    test('prioritizes same-tier supersets before PADRAO for EFICIENTE', () => {
        expect(getModelProfileFallbackOrder('EFICIENTE')).toEqual([
            'EFICIENTE',
            'EFICIENTE_MP3',
            'EFICIENTE_PDF',
            'EFICIENTE_MP3_PDF',
            'PADRAO',
            'PADRAO_MP3',
            'PADRAO_PDF',
            'PADRAO_MP3_PDF',
        ])
    })

    test('resolves EFICIENTE through EFICIENTE_MP3_PDF before PADRAO', () => {
        const resolved = resolveProfileModel('EFICIENTE', {
            EFICIENTE_MP3_PDF: 'gemini-2.5-flash-lite',
            PADRAO: 'gemini-3.1-flash-lite',
        })

        expect(resolved).toBe('gemini-2.5-flash-lite')
    })

    test('falls back to PADRAO family when same tier is missing', () => {
        const resolved = resolveProfileModel('EFICIENTE_MP3', {
            PADRAO_MP3_PDF: 'gemini-2.5-flash-lite',
            PADRAO: 'gemini-3.1-flash-lite',
        })

        expect(resolved).toBe('gemini-2.5-flash-lite')
    })

    test('falls back to PADRAO puro as final option', () => {
        const resolved = resolveProfileModel('EFICIENTE_MP3_PDF', {
            PADRAO: 'gemini-3.1-flash-lite',
        })

        expect(resolved).toBe('gemini-3.1-flash-lite')
    })

    test('builds alternative default order from PADRAO to PREMIUM', () => {
        expect(getAlternativeDefaultProfileFallbackOrder()).toEqual([
            'PADRAO',
            'PADRAO_MP3',
            'PADRAO_PDF',
            'PADRAO_MP3_PDF',
            'EFICIENTE',
            'EFICIENTE_MP3',
            'EFICIENTE_PDF',
            'EFICIENTE_MP3_PDF',
            'VERSATIL',
            'VERSATIL_MP3',
            'VERSATIL_PDF',
            'VERSATIL_MP3_PDF',
            'PREMIUM',
            'PREMIUM_MP3',
            'PREMIUM_PDF',
            'PREMIUM_MP3_PDF',
        ])
    })

    test('resolves alternative default profile through higher tiers when PADRAO is missing', () => {
        const resolved = resolveAlternativeDefaultProfileModel({
            VERSATIL_PDF: 'gemini-2.5-pro',
            PREMIUM: 'claude-sonnet-4-5-20250929',
        })

        expect(resolved).toBe('gemini-2.5-pro')
    })
})