// npm test -- sync-engine.test.ts
//
// Tests for the sync engine components:
// - parse-prompt-md: parsing .md files with YAML front matter
// - providers/local: reading prompts from filesystem

import { parsePromptMarkdown } from '@/lib/sync/parse-prompt-md'

describe('parsePromptMarkdown', () => {
    test('parses a complete .md file with all sections', () => {
        const md = `---
uuid: 9c8f98fb-0679-4f2a-9722-91c2e1b35600
author: test-author
---

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

    test('parses a file with only front matter and PROMPT', () => {
        const md = `---
uuid: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
---

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

    test('returns null when front matter has no uuid', () => {
        const md = `---
author: someone
---

# PROMPT

Hello world
`
        const result = parsePromptMarkdown('no-uuid', md, 'no-uuid.md')
        expect(result).toBeNull()
    })

    test('returns null for files without front matter', () => {
        const md = `Just some text without any sections at all.`
        const result = parsePromptMarkdown('plain', md, 'plain.md')
        expect(result).toBeNull()
    })

    test('derives name from slug when metadata has no name', () => {
        const md = `---
uuid: 11111111-2222-3333-4444-555555555555
---

# PROMPT

Test prompt
`
        const result = parsePromptMarkdown('meu-prompt-legal', md, 'meu-prompt-legal.md')

        expect(result).not.toBeNull()
        expect(result!.name).toBe('Meu Prompt Legal')
    })

    test('parses predecessors and successors from front matter', () => {
        const md = `---
uuid: 11111111-2222-3333-4444-555555555555
predecessors:
  - path: pedidos-fundamentacoes-e-dispositivos
successors:
  - path: chat
---

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
        const md = `---
uuid: 22222222-3333-4444-5555-666666666666
predecessors:
  - path: pedidos-viabilidade-recurso
  - path: pesquisa-de-temas
    optional: true
  - path: juizo-viabilidade-recurso
successors:
  - path: chat
---

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
        const md = `---
uuid: 33333333-4444-5555-6666-777777777777
successors:
  - path: chat
---

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
        const md = `---
uuid: 44444444-5555-6666-7777-888888888888
successors:
  - path: pedidos-fundamentacoes-e-dispositivos
  - path: voto
  - path: chat
---

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
        const md = `---
uuid: 55555555-6666-7777-8888-999999999999
---

# PROMPT

No workflow
`
        const result = parsePromptMarkdown('no-workflow', md, 'no-workflow.md')

        expect(result).not.toBeNull()
        expect(result!.predecessors).toBeUndefined()
        expect(result!.successors).toBeUndefined()
    })

    describe('summary normalization', () => {
        const baseMd = (summaryValue: string) => `---
uuid: aa000000-0000-0000-0000-000000000001
summary: ${summaryValue}
---

# PROMPT

Test
`
        test.each([
            ['SIM', 'SIM'],
            ['sim', 'SIM'],
            ['true', 'SIM'],
            ['yes', 'SIM'],
            ['1', 'SIM'],
            ['NAO', 'NAO'],
            ['nao', 'NAO'],
            ['false', 'NAO'],
            ['no', 'NAO'],
            ['0', 'NAO'],
        ])('normalizes "%s" to "%s"', (input, expected) => {
            const result = parsePromptMarkdown('test', baseMd(input), 'test.md')
            expect(result).not.toBeNull()
            expect(result!.metadata.summary).toBe(expected)
        })

        test('normalizes YAML boolean true to SIM', () => {
            // YAML parses bare `true` as boolean
            const md = `---
uuid: aa000000-0000-0000-0000-000000000002
summary: true
---

# PROMPT

Test
`
            const result = parsePromptMarkdown('test', md, 'test.md')
            expect(result).not.toBeNull()
            expect(result!.metadata.summary).toBe('SIM')
        })

        test('normalizes YAML boolean false to NAO', () => {
            const md = `---
uuid: aa000000-0000-0000-0000-000000000003
summary: false
---

# PROMPT

Test
`
            const result = parsePromptMarkdown('test', md, 'test.md')
            expect(result).not.toBeNull()
            expect(result!.metadata.summary).toBe('NAO')
        })

        test('does not set summary when absent', () => {
            const md = `---
uuid: aa000000-0000-0000-0000-000000000004
---

# PROMPT

Test
`
            const result = parsePromptMarkdown('test', md, 'test.md')
            expect(result).not.toBeNull()
            expect(result!.metadata.summary).toBeUndefined()
        })
    })

    describe('piece_descr normalization', () => {
        test('accepts canonical enum keys', () => {
            const md = `---
uuid: bb000000-0000-0000-0000-000000000001
piece_descr:
  - PETICAO_INICIAL
  - SENTENCA
---

# PROMPT

Test
`
            const result = parsePromptMarkdown('test', md, 'test.md')
            expect(result).not.toBeNull()
            expect(result!.metadata.piece_descr).toEqual(['PETICAO_INICIAL', 'SENTENCA'])
        })

        test('accepts slugified keys', () => {
            const md = `---
uuid: bb000000-0000-0000-0000-000000000002
piece_descr:
  - peticao-inicial
  - sentenca
  - despacho-decisao
---

# PROMPT

Test
`
            const result = parsePromptMarkdown('test', md, 'test.md')
            expect(result).not.toBeNull()
            expect(result!.metadata.piece_descr).toEqual(['PETICAO_INICIAL', 'SENTENCA', 'DESPACHO_DECISAO'])
        })

        test('filters out invalid values', () => {
            const md = `---
uuid: bb000000-0000-0000-0000-000000000003
piece_descr:
  - PETICAO_INICIAL
  - INVALIDO_TIPO
---

# PROMPT

Test
`
            const result = parsePromptMarkdown('test', md, 'test.md')
            expect(result).not.toBeNull()
            expect(result!.metadata.piece_descr).toEqual(['PETICAO_INICIAL'])
        })

        test('deletes piece_descr when all values are invalid', () => {
            const md = `---
uuid: bb000000-0000-0000-0000-000000000004
piece_descr:
  - FOO
  - BAR
---

# PROMPT

Test
`
            const result = parsePromptMarkdown('test', md, 'test.md')
            expect(result).not.toBeNull()
            expect(result!.metadata.piece_descr).toBeUndefined()
        })

        test('does not set piece_descr when absent', () => {
            const md = `---
uuid: bb000000-0000-0000-0000-000000000005
---

# PROMPT

Test
`
            const result = parsePromptMarkdown('test', md, 'test.md')
            expect(result).not.toBeNull()
            expect(result!.metadata.piece_descr).toBeUndefined()
        })
    })
})

describe('createProvider (factory)', () => {
    const { createProvider, parseLibrariesEnv, findLibraryConfig } = require('@/lib/sync/providers/factory')

    test('creates LocalProvider for local: prefix', () => {
        const provider = createProvider('local:./prompts')
        expect(provider.constructor.name).toBe('LocalProvider')
    })

    test('creates LocalProvider for ./ path', () => {
        const provider = createProvider('./prompts')
        expect(provider.constructor.name).toBe('LocalProvider')
    })

    test('creates GitHubProvider for github.com URLs', () => {
        const provider = createProvider('https://github.com/owner/repo')
        expect(provider.constructor.name).toBe('GitHubProvider')
    })

    test('creates GitHubProvider for github.com URLs with branch', () => {
        const provider = createProvider('https://github.com/owner/repo#develop')
        expect(provider.constructor.name).toBe('GitHubProvider')
    })

    test('creates GitLabProvider for gitlab.com URLs', () => {
        const provider = createProvider('https://gitlab.com/group/repo')
        expect(provider.constructor.name).toBe('GitLabProvider')
    })

    test('creates GitLabProvider for self-hosted GitLab', () => {
        const provider = createProvider('https://gitlab.example.com/group/repo')
        expect(provider.constructor.name).toBe('GitLabProvider')
    })

    test('throws for invalid URL', () => {
        expect(() => createProvider('not-a-url')).toThrow('Invalid library URL')
    })

    describe('parseLibrariesEnv', () => {
        test('parses semicolon-separated entries with url,prefix,token', () => {
            const configs = parseLibrariesEnv('https://github.com/trf2/prompts,trf2,ghp_xxxx;https://gitlab.com/cnj/prompts,cnj,glpat-yyyy')
            expect(configs).toHaveLength(2)
            expect(configs[0]).toEqual({ url: 'https://github.com/trf2/prompts', slugPrefix: 'trf2', token: 'ghp_xxxx' })
            expect(configs[1]).toEqual({ url: 'https://gitlab.com/cnj/prompts', slugPrefix: 'cnj', token: 'glpat-yyyy' })
        })

        test('parses entries with url and prefix only (no token)', () => {
            const configs = parseLibrariesEnv('https://github.com/org/repo,myprefix')
            expect(configs).toHaveLength(1)
            expect(configs[0]).toEqual({ url: 'https://github.com/org/repo', slugPrefix: 'myprefix', token: undefined })
        })

        test('parses entries with url only (no prefix, no token)', () => {
            const configs = parseLibrariesEnv('https://github.com/org/repo')
            expect(configs).toHaveLength(1)
            expect(configs[0]).toEqual({ url: 'https://github.com/org/repo', slugPrefix: undefined, token: undefined })
        })

        test('supports empty prefix with token (url,,token)', () => {
            const configs = parseLibrariesEnv('https://github.com/org/repo,,ghp_secrettoken')
            expect(configs).toHaveLength(1)
            expect(configs[0]).toEqual({ url: 'https://github.com/org/repo', slugPrefix: undefined, token: 'ghp_secrettoken' })
        })

        test('returns empty array for undefined', () => {
            expect(parseLibrariesEnv(undefined)).toEqual([])
        })

        test('returns empty array for empty string', () => {
            expect(parseLibrariesEnv('')).toEqual([])
        })

        test('trims whitespace from entries', () => {
            const configs = parseLibrariesEnv('  https://github.com/a/b , pfx , tok ; https://github.com/c/d  ')
            expect(configs).toHaveLength(2)
            expect(configs[0]).toEqual({ url: 'https://github.com/a/b', slugPrefix: 'pfx', token: 'tok' })
            expect(configs[1]).toEqual({ url: 'https://github.com/c/d', slugPrefix: undefined, token: undefined })
        })

        test('skips empty entries from trailing semicolons', () => {
            const configs = parseLibrariesEnv('https://github.com/a/b;')
            expect(configs).toHaveLength(1)
        })
    })

    describe('findLibraryConfig', () => {
        test('finds config by substring match', () => {
            const configs = [
                { url: 'https://github.com/owner/repo#main', slugPrefix: 'pfx', token: 'tok' },
            ]
            const found = findLibraryConfig('https://github.com/owner/repo', configs)
            expect(found).toBeTruthy()
            expect(found!.slugPrefix).toBe('pfx')
        })

        test('returns undefined when no match', () => {
            const configs = [
                { url: 'https://github.com/other/repo', slugPrefix: undefined, token: undefined },
            ]
            expect(findLibraryConfig('https://github.com/owner/repo', configs)).toBeUndefined()
        })
    })
})

describe('GitProvider URL parsing', () => {
    // We test URL parsing through the concrete GitHubProvider/GitLabProvider constructors

    test('parses GitHub URL into owner/repo/ref', () => {
        const { GitHubProvider } = require('@/lib/sync/providers/github')
        const p = new GitHubProvider('https://github.com/cnj-ia/prompts-core')
        expect(p.owner).toBe('cnj-ia')
        expect(p.repo).toBe('prompts-core')
        expect(p.ref).toBe('main')
    })

    test('parses GitHub URL with branch', () => {
        const { GitHubProvider } = require('@/lib/sync/providers/github')
        const p = new GitHubProvider('https://github.com/cnj-ia/prompts-core#develop')
        expect(p.owner).toBe('cnj-ia')
        expect(p.repo).toBe('prompts-core')
        expect(p.ref).toBe('develop')
    })

    test('parses GitLab nested group URL', () => {
        const { GitLabProvider } = require('@/lib/sync/providers/gitlab')
        const p = new GitLabProvider('https://gitlab.com/group/subgroup/repo')
        expect(p.owner).toBe('group/subgroup')
        expect(p.repo).toBe('repo')
        expect(p.ref).toBe('main')
    })

    test('strips .git suffix', () => {
        const { GitHubProvider } = require('@/lib/sync/providers/github')
        const p = new GitHubProvider('https://github.com/owner/repo.git')
        expect(p.repo).toBe('repo')
    })

    test('strips trailing slashes', () => {
        const { GitHubProvider } = require('@/lib/sync/providers/github')
        const p = new GitHubProvider('https://github.com/owner/repo/')
        expect(p.repo).toBe('repo')
    })

    test('throws for URL with no path', () => {
        const { GitHubProvider } = require('@/lib/sync/providers/github')
        expect(() => new GitHubProvider('https://github.com/')).toThrow('Invalid git repository URL')
    })
})

describe('validatePromptFiles', () => {
    const { validatePromptFiles } = require('@/lib/sync/validate')

    test('validates a valid prompt file', () => {
        const result = validatePromptFiles([{
            path: 'test.md',
            content: `---
uuid: 9c8f98fb-0679-4f2a-9722-91c2e1b35600
name: Test
---

# PROMPT

Hello world
`,
        }])
        expect(result.valid).toBe(true)
        expect(result.files).toHaveLength(1)
        expect(result.files[0].errors).toHaveLength(0)
    })

    test('rejects file without uuid', () => {
        const result = validatePromptFiles([{
            path: 'no-uuid.md',
            content: `---
name: Test
---

# PROMPT

Hello
`,
        }])
        expect(result.valid).toBe(false)
        expect(result.files[0].errors).toContain('Missing uuid in front matter')
    })

    test('rejects file with invalid UUID format', () => {
        const result = validatePromptFiles([{
            path: 'bad-uuid.md',
            content: `---
uuid: not-a-valid-uuid
name: Test
---

# PROMPT

Hello
`,
        }])
        expect(result.valid).toBe(false)
        expect(result.files[0].errors[0]).toContain('Invalid UUID format')
    })

    test('detects duplicate UUIDs', () => {
        const result = validatePromptFiles([
            {
                path: 'file1.md',
                content: `---
uuid: 9c8f98fb-0679-4f2a-9722-91c2e1b35600
---

# PROMPT

First
`,
            },
            {
                path: 'file2.md',
                content: `---
uuid: 9c8f98fb-0679-4f2a-9722-91c2e1b35600
---

# PROMPT

Second
`,
            },
        ])
        expect(result.valid).toBe(false)
        const file2 = result.files.find((f: any) => f.path === 'file2.md')
        expect(file2!.errors[0]).toContain('Duplicate UUID')
    })

    test('rejects duplicate slugs within the same file set', () => {
        const result = validatePromptFiles([
            {
                path: 'analise.md',
                content: `---
uuid: aaaaaaaa-1111-2222-aaaa-444444444444
---

# PROMPT

First
`,
            },
            {
                path: 'subdir/analise.md',
                content: `---
uuid: bbbbbbbb-1111-2222-aaaa-555555555555
---

# PROMPT

Second with same slug
`,
            },
        ])
        expect(result.valid).toBe(false)
        const file2 = result.files.find((f: any) => f.path === 'subdir/analise.md')
        expect(file2!.errors[0]).toContain('Duplicate slug')
        expect(file2!.errors[0]).toContain('analise')
    })

    test('allows same slug when same uuid (same file listed twice)', () => {
        const result = validatePromptFiles([
            {
                path: 'analise.md',
                content: `---
uuid: aaaaaaaa-1111-2222-aaaa-444444444444
---

# PROMPT

First
`,
            },
        ])
        expect(result.valid).toBe(true)
    })

    test('warns on unresolved workflow reference', () => {
        const result = validatePromptFiles([{
            path: 'with-workflow.md',
            content: `---
uuid: aaaaaaaa-bbbb-1111-aaaa-aaaaaaaaaaaa
predecessors:
  - path: nonexistent-prompt
---

# PROMPT

Test
`,
        }])
        expect(result.valid).toBe(true) // warnings don't fail validation
        expect(result.files[0].warnings.some((w: string) => w.includes('nonexistent-prompt'))).toBe(true)
    })

    test('warns on missing prompt content', () => {
        const result = validatePromptFiles([{
            path: 'no-content.md',
            content: `---
uuid: bbbbbbbb-cccc-1111-aaaa-aaaaaaaaaaaa
---
`,
        }])
        expect(result.valid).toBe(true)
        expect(result.files[0].warnings.some((w: string) => w.includes('No SYSTEM PROMPT or PROMPT'))).toBe(true)
    })

    test('skips non-.md files with warning', () => {
        const result = validatePromptFiles([{ path: 'readme.txt', content: 'hello' }])
        expect(result.valid).toBe(true)
        expect(result.files[0].warnings[0]).toContain('.md extension')
    })

    test('resolves workflow references within the file set', () => {
        const result = validatePromptFiles([
            {
                path: 'chat.md',
                content: `---
uuid: aaaaaaaa-bbbb-1111-aaaa-111111111111
---

# PROMPT

Chat prompt
`,
            },
            {
                path: 'analise.md',
                content: `---
uuid: aaaaaaaa-bbbb-1111-aaaa-222222222222
successors:
  - path: chat
---

# PROMPT

Analysis prompt
`,
            },
        ])
        expect(result.valid).toBe(true)
        const analise = result.files.find((f: any) => f.path === 'analise.md')
        // No warnings about unresolved refs since 'chat' exists
        expect(analise!.warnings.filter((w: string) => w.includes('could not be resolved'))).toHaveLength(0)
    })
})
