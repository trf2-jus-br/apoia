import { getSemanticSearchTool } from '../lib/ai-tools/tools-semantic-search'
import { UserType } from '../lib/user'

// Mock global fetch
const originalFetch = global.fetch

describe('getSemanticSearchTool', () => {
  // Configurar variável de ambiente para testes
  const originalEnv = process.env.SEMANTIC_SEARCH_API_URL

  beforeEach(() => {
    jest.resetAllMocks()
    process.env.SEMANTIC_SEARCH_API_URL = 'http://www.example.com/api/v1'
  })

  afterAll(() => {
    global.fetch = originalFetch as any
    if (originalEnv) {
      process.env.SEMANTIC_SEARCH_API_URL = originalEnv
    } else {
      delete process.env.SEMANTIC_SEARCH_API_URL
    }
  })

  const dummyUser: Promise<UserType> = Promise.resolve({
    preferredUsername: 'tester',
  } as any)

  test('retorna resultados normalizados', async () => {
    const mockResponse = {
      results: [
        {
          item: {
            id: '10acbc6b-2568-4fa3-b753-b5f27ebd51fd',
            sourceId: 'ba61b168-6632-4447-8d0a-6fd578e49a88',
            externalId: 'stf-rg-1456',
            content: 'Conteúdo sobre repercussão geral',
            data: { nr: 1456, tipo: 'RG', orgao: 'STF', questao: 'Questão 1456' }
          },
          renderedTitle: 'Tema 1456/STF',
          renderedDisplay: '<div>Tema 1456</div>',
          similarity: 0.95,
          vectorScore: 0.95,
          textScore: 0,
          source: {
            id: 'ba61b168-6632-4447-8d0a-6fd578e49a88',
            slug: 'stf-rg',
            name: 'STF - Temas de Repercussão Geral'
          }
        },
        {
          item: {
            id: 'e18f3e38-dab7-4a04-9732-179b5fd5e671',
            sourceId: 'ba61b168-6632-4447-8d0a-6fd578e49a88',
            externalId: 'stj-rer-456',
            content: 'Conteúdo sobre recurso repetitivo',
            data: { nr: 456, tipo: 'RER', orgao: 'STJ', questao: 'Questão 456' }
          },
          renderedTitle: 'Recurso STJ 456',
          renderedDisplay: '<div>STJ 456</div>',
          similarity: 0.87,
          vectorScore: 0.87,
          textScore: 0,
          source: {
            id: 'cd72f168-1234-4447-8d0a-6fd578e49a88',
            slug: 'stj-rer',
            name: 'STJ - Recursos Repetitivos'
          }
        }
      ]
    }

    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockResponse }) as any

    const tool = getSemanticSearchTool(dummyUser)
    const result: any = await tool.execute(
      { query: 'direito previdenciário', limit: 10, offset: 0, searchType: 'hybrid', hybridAlpha: 0.5 },
      { toolCallId: 't1', messages: [] } as any
    )

    expect(result.status).toBe('OK')
    expect(result.total).toBe(2)
    expect(result.count).toBe(2)
    expect(result.results.length).toBe(2)
    expect(result.results[0].id).toBe('10acbc6b-2568-4fa3-b753-b5f27ebd51fd')
    expect(result.results[0].title).toBe('Tema 1456/STF')
    expect(result.results[0].sourceSlug).toBe('stf-rg')
  })

  test('erro HTTP', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as any
    
    const tool = getSemanticSearchTool(dummyUser)
    const result: any = await tool.execute(
      { query: 'falha', limit: 10, offset: 0, searchType: 'hybrid', hybridAlpha: 0.5 },
      { toolCallId: 't2', messages: [] } as any
    )
    
    expect(result.status).toBe('ERROR')
    expect(result.results.length).toBe(0)
  })

  test('retorna erro quando ENV não está configurada', async () => {
    delete process.env.SEMANTIC_SEARCH_API_URL
    
    const tool = getSemanticSearchTool(dummyUser)
    const result: any = await tool.execute(
      { query: 'teste', limit: 10, offset: 0, searchType: 'hybrid', hybridAlpha: 0.5 },
      { toolCallId: 't3', messages: [] } as any
    )
    
    expect(result.status).toBe('ERROR')
    expect(result.error).toContain('SEMANTIC_SEARCH_API_URL')
  })

  test('valida tamanho mínimo da query', async () => {
    const tool = getSemanticSearchTool(dummyUser)
    const result: any = await tool.execute(
      { query: 'ab', limit: 10, offset: 0, searchType: 'hybrid', hybridAlpha: 0.5 },
      { toolCallId: 't4', messages: [] } as any
    )
    
    expect(result.status).toBe('ERROR')
  })

  test('usa valores default quando não especificados', async () => {
    const mockResponse = {
      results: [
        {
          item: { id: 'aaa', sourceId: 'src1', externalId: 'ext-1', data: {} },
          renderedTitle: 'Teste',
          similarity: 0.9,
          source: { id: 'src1', slug: 'stf-rg', name: 'STF' }
        }
      ]
    }

    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockResponse }) as any

    const tool = getSemanticSearchTool(dummyUser)
    const result: any = await tool.execute(
      { query: 'teste' },
      { toolCallId: 't5', messages: [] } as any
    )

    expect(result.status).toBe('OK')
    expect(result.limit).toBe(10)
    expect(result.offset).toBe(0)
  })

  test('respeita maxItems quando fornecido', async () => {
    const makeItem = (n: number) => ({
      item: { id: `id-${n}`, sourceId: 'src1', externalId: `ext-${n}`, data: {} },
      renderedTitle: `Resultado ${n}`,
      similarity: 0.9,
      source: { id: 'src1', slug: 'stf-rg', name: 'STF' }
    })
    const mockResponse = {
      results: [1, 2, 3, 4, 5].map(makeItem)
    }

    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockResponse }) as any

    const tool = getSemanticSearchTool(dummyUser)
    const result: any = await tool.execute(
      { query: 'teste', maxItems: 2 },
      { toolCallId: 't6', messages: [] } as any
    )

    expect(result.status).toBe('OK')
    expect(result.count).toBe(2)
    expect(result.results.length).toBe(2)
  })

  test('funciona com sourceSlugs filtrados', async () => {
    const mockResponse = {
      results: [
        {
          item: { id: 'aaa', sourceId: 'src1', externalId: 'stf-rg-1', data: {} },
          renderedTitle: 'Tema STF',
          similarity: 0.9,
          source: { id: 'src1', slug: 'stf-rg', name: 'STF' }
        }
      ]
    }

    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockResponse }) as any

    const tool = getSemanticSearchTool(dummyUser)
    const result: any = await tool.execute(
      { query: 'teste', sourceSlugs: ['stf-rg', 'stj-rer'] },
      { toolCallId: 't7', messages: [] } as any
    )

    expect(result.status).toBe('OK')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"sourceSlugs":["stf-rg","stj-rer"]')
      })
    )
  })
})
