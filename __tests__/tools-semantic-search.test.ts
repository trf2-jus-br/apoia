import { getSemanticSearchTool } from '../lib/ai/tools-semantic-search'
import { UserType } from '../lib/user'

// Mock global fetch
const originalFetch = global.fetch

describe('getSemanticSearchTool', () => {
  // Configurar variável de ambiente para testes
  const originalEnv = process.env.SEMANTIC_SEARCH_API_URL
  
  beforeEach(() => {
    jest.resetAllMocks()
    process.env.SEMANTIC_SEARCH_API_URL = 'https://api.exemplo.com'
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
      total: 2,
      limit: 10,
      offset: 0,
      results: [
        {
          id: '1',
          title: 'Tema STF 123',
          content: 'Conteúdo sobre repercussão geral',
          sourceSlug: 'stf-rg',
          score: 0.95,
          metadata: { orgao: 'STF', tipo: 'RG' }
        },
        {
          id: '2',
          title: 'Recurso STJ 456',
          content: 'Conteúdo sobre recurso repetitivo',
          sourceSlug: 'stj-rer',
          score: 0.87
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
    expect(result.results[0].id).toBe('1')
    expect(result.results[0].title).toBe('Tema STF 123')
    expect(result.results[0].score).toBe(0.95)
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
      total: 1,
      limit: 10,
      offset: 0,
      results: [{ id: '1', title: 'Teste', content: 'Conteúdo' }]
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
    const mockResponse = {
      total: 5,
      limit: 10,
      offset: 0,
      results: [
        { id: '1', title: 'Resultado 1' },
        { id: '2', title: 'Resultado 2' },
        { id: '3', title: 'Resultado 3' },
        { id: '4', title: 'Resultado 4' },
        { id: '5', title: 'Resultado 5' }
      ]
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
      total: 1,
      limit: 10,
      offset: 0,
      results: [{ id: '1', title: 'Tema STF', sourceSlug: 'stf-rg' }]
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
