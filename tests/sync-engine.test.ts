// npm test -- sync-engine.test.ts
//
// Tests for the sync engine components:
// - parse-prompt-md: parsing .md files with METADATA sections
// - providers/local: reading prompts from filesystem

import { parsePromptMarkdown } from '@/lib/sync/parse-prompt-md'

describe('parsePromptMarkdown', () => {
    test('parses a complete .md file with all sections', () => {
        const md = `# METADATA

uuid: 9c8f98fb-0679-4f2a-9722-91c2e1b35600
author: test-author

# SYSTEM PROMPT

Voce e um assistente juridico.

# PROMPT

Analise o seguinte caso:

{{textos}}

# JSON SCHEMA

{"type": "object", "properties": {"resultado": {"type": "string"}}}

# FORMAT

Responda em markdown.
`
        const result = parsePromptMarkdown('analise', md, 'analise.md')

        expect(result).not.toBeNull()
        expect(result!.uuid).toBe('9c8f98fb-0679-4f2a-9722-91c2e1b35600')
        expect(result!.slug).toBe('analise')
        expect(result!.metadata.author).toBe('test-author')
        expect(result!.systemPrompt).toContain('assistente juridico')
        expect(result!.prompt).toContain('{{textos}}')
        expect(result!.jsonSchema).toContain('"type": "object"')
        expect(result!.format).toContain('markdown')
    })

    test('parses a file with only METADATA and PROMPT', () => {
        const md = `# METADATA

uuid: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee

# PROMPT

Faca um resumo de {{textos}}
`
        const result = parsePromptMarkdown('resumo', md, 'resumo.md')

        expect(result).not.toBeNull()
        expect(result!.uuid).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
        expect(result!.slug).toBe('resumo')
        expect(result!.systemPrompt).toBeNull()
        expect(result!.prompt).toContain('Faca um resumo')
        expect(result!.jsonSchema).toBeNull()
        expect(result!.format).toBeNull()
    })

    test('returns null when METADATA has no uuid', () => {
        const md = `# METADATA

author: someone

# PROMPT

Hello world
`
        const result = parsePromptMarkdown('no-uuid', md, 'no-uuid.md')
        expect(result).toBeNull()
    })

    test('returns null for files without METADATA section', () => {
        const md = `Just some text without any sections at all.`
        const result = parsePromptMarkdown('plain', md, 'plain.md')
        expect(result).toBeNull()
    })

    test('derives name from slug when metadata has no name', () => {
        const md = `# METADATA

uuid: 11111111-2222-3333-4444-555555555555

# PROMPT

Test prompt
`
        const result = parsePromptMarkdown('meu-prompt-legal', md, 'meu-prompt-legal.md')

        expect(result).not.toBeNull()
        expect(result!.name).toBe('Meu Prompt Legal')
    })

    test('parses predecessors and successors from METADATA', () => {
        const md = `# METADATA

uuid: 11111111-2222-3333-4444-555555555555
predecessors:
  - path: pedidos-fundamentacoes-e-dispositivos
successors:
  - path: chat

# PROMPT

Test prompt with workflow
`
        const result = parsePromptMarkdown('sentenca-test', md, 'sentenca-test.md')

        expect(result).not.toBeNull()
        expect(result!.predecessors).toHaveLength(1)
        expect(result!.predecessors![0]).toEqual({ path: 'pedidos-fundamentacoes-e-dispositivos' })
        expect(result!.successors).toHaveLength(1)
        expect(result!.successors![0]).toEqual({ path: 'chat' })
    })

    test('parses multiple predecessors with optional flag', () => {
        const md = `# METADATA

uuid: 22222222-3333-4444-5555-666666666666
predecessors:
  - path: pedidos-viabilidade-recurso
  - path: pesquisa-de-temas
    optional: true
  - path: juizo-viabilidade-recurso
successors:
  - path: chat

# PROMPT

Multi-predecessor test
`
        const result = parsePromptMarkdown('multi-pred', md, 'multi-pred.md')

        expect(result).not.toBeNull()
        expect(result!.predecessors).toHaveLength(3)
        expect(result!.predecessors![0]).toEqual({ path: 'pedidos-viabilidade-recurso' })
        expect(result!.predecessors![1]).toEqual({ path: 'pesquisa-de-temas', optional: true })
        expect(result!.predecessors![2]).toEqual({ path: 'juizo-viabilidade-recurso' })
    })

    test('parses successors-only workflow (no predecessors)', () => {
        const md = `# METADATA

uuid: 33333333-4444-5555-6666-777777777777
successors:
  - path: chat

# PROMPT

Successors only
`
        const result = parsePromptMarkdown('succ-only', md, 'succ-only.md')

        expect(result).not.toBeNull()
        expect(result!.predecessors).toBeUndefined()
        expect(result!.successors).toHaveLength(1)
        expect(result!.successors![0]).toEqual({ path: 'chat' })
    })

    test('parses non-standard successors list', () => {
        const md = `# METADATA

uuid: 44444444-5555-6666-7777-888888888888
successors:
  - path: pedidos-fundamentacoes-e-dispositivos
  - path: voto
  - path: chat

# PROMPT

Multiple successors
`
        const result = parsePromptMarkdown('multi-succ', md, 'multi-succ.md')

        expect(result).not.toBeNull()
        expect(result!.successors).toHaveLength(3)
        expect(result!.successors![0]).toEqual({ path: 'pedidos-fundamentacoes-e-dispositivos' })
        expect(result!.successors![1]).toEqual({ path: 'voto' })
        expect(result!.successors![2]).toEqual({ path: 'chat' })
    })

    test('prompts without workflow refs have no predecessors/successors', () => {
        const md = `# METADATA

uuid: 55555555-6666-7777-8888-999999999999

# PROMPT

No workflow
`
        const result = parsePromptMarkdown('no-workflow', md, 'no-workflow.md')

        expect(result).not.toBeNull()
        expect(result!.predecessors).toBeUndefined()
        expect(result!.successors).toBeUndefined()
    })

    test('parses all actual prompt files without errors', () => {
        // This test reads the real prompts directory and ensures every
        // file with # METADATA can be parsed successfully
        const fs = require('fs')
        const path = require('path')
        const promptsDir = path.resolve(__dirname, '..', 'prompts')

        if (!fs.existsSync(promptsDir)) {
            console.warn('Prompts directory not found, skipping integration check')
            return
        }

        const files: string[] = []
        function walk(dir: string) {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name)
                if (entry.isDirectory()) walk(full)
                else if (entry.name.endsWith('.md')) files.push(full)
            }
        }
        walk(promptsDir)

        const parsed: any[] = []
        const uuids = new Set<string>()

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8')
            const rel = path.relative(promptsDir, file).replace(/\\/g, '/')
            const slug = path.basename(file, '.md')

            // Should not throw
            const result = parsePromptMarkdown(slug, content, rel)
            if (result) {
                parsed.push(result)

                // UUID should be a valid format
                expect(result.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

                // UUID should be unique
                expect(uuids.has(result.uuid)).toBe(false)
                uuids.add(result.uuid)
            }
        }

        // We should have parsed at least 40 prompts (we know we added 46)
        expect(parsed.length).toBeGreaterThanOrEqual(40)
        console.log(`Successfully parsed ${parsed.length} prompts with unique UUIDs`)
    })
})

describe('LocalProvider', () => {
    test('reads prompts from the real prompts directory', async () => {
        const { LocalProvider } = require('@/lib/sync/providers/local')

        const provider = new LocalProvider('local:./prompts')
        const contents = await provider.read()

        expect(contents.library).toBe('local:./prompts')
        expect(contents.version).toBeTruthy()
        expect(contents.version.length).toBe(16) // hex hash substring
        expect(contents.prompts.length).toBeGreaterThanOrEqual(40)

        // Every prompt should have a uuid and slug
        for (const p of contents.prompts) {
            expect(p.uuid).toMatch(/^[0-9a-f]{8}-/)
            expect(p.slug).toBeTruthy()
            expect(p.relativePath).toBeTruthy()
        }

        // Check a known prompt exists
        const analise = contents.prompts.find(p => p.slug === 'analise')
        expect(analise).toBeTruthy()
        expect(analise!.uuid).toBe('9c8f98fb-0679-4f2a-9722-91c2e1b35600')

        console.log(`LocalProvider read ${contents.prompts.length} prompts, version: ${contents.version}`)
    })

    test('real prompts have correct workflow metadata', async () => {
        const { LocalProvider } = require('@/lib/sync/providers/local')

        const provider = new LocalProvider('local:./prompts')
        const contents = await provider.read()

        // sentenca should have predecessors and successors
        const sentenca = contents.prompts.find((p: any) => p.slug === 'sentenca')
        expect(sentenca).toBeTruthy()
        expect(sentenca!.predecessors).toHaveLength(1)
        expect(sentenca!.predecessors![0].path).toBe('pedidos-fundamentacoes-e-dispositivos')
        expect(sentenca!.successors).toHaveLength(1)
        expect(sentenca!.successors![0].path).toBe('chat')

        // decisao-viabilidade-recurso-especial should have 3 predecessors
        const decisaoEsp = contents.prompts.find((p: any) => p.slug === 'decisao-viabilidade-recurso-especial')
        expect(decisaoEsp).toBeTruthy()
        expect(decisaoEsp!.predecessors).toHaveLength(3)
        expect(decisaoEsp!.predecessors!.map((r: any) => r.path)).toEqual([
            'pedidos-viabilidade-recurso',
            'pesquisa-de-temas',
            'juizo-viabilidade-recurso',
        ])

        // prev-apesp-pontos-controvertidos-segunda-instancia should have non-standard successors
        const prevApesp2 = contents.prompts.find((p: any) => p.slug === 'prev-apesp-pontos-controvertidos-segunda-instancia')
        expect(prevApesp2).toBeTruthy()
        expect(prevApesp2!.predecessors).toBeUndefined()
        expect(prevApesp2!.successors).toHaveLength(3)
        expect(prevApesp2!.successors!.map((r: any) => r.path)).toEqual([
            'pedidos-fundamentacoes-e-dispositivos',
            'voto',
            'chat',
        ])

        // chat should have NO workflow metadata
        const chat = contents.prompts.find((p: any) => p.slug === 'chat')
        expect(chat).toBeTruthy()
        expect(chat!.predecessors).toBeUndefined()
        expect(chat!.successors).toBeUndefined()

        // Count prompts with workflow data
        const withWorkflow = contents.prompts.filter((p: any) => p.predecessors || p.successors)
        console.log(`${withWorkflow.length} prompts have workflow metadata`)
        expect(withWorkflow.length).toBeGreaterThanOrEqual(17) // At least 17 prompts should have workflows
    })
})
