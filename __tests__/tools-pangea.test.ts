import { getPangeaTool } from '../lib/ai-tools/tools-pangea'
import { UserType } from '../lib/user'

// Mock global fetch
const originalFetch = global.fetch

describe('getPangeaTool', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  afterAll(() => {
    global.fetch = originalFetch as any
  })

  const dummyUser: Promise<UserType> = Promise.resolve({
    preferredUsername: 'tester',
  } as any)

  test('retorna resultados normalizados (stripHtml default)', async () => {
    const mockResponse = {
      total: 2,
      resultados: [
        {
          id: '1',
          tipo: 'RG',
          orgao: 'STF',
          nr: 123,
          tese: 'Texto <mark>com</mark> destaque',
          highlight: { tese: 'Texto <mark>com</mark> destaque' },
          processosParadigma: [{ numero: 'RE 123', link: 'http://example' }],
          situacao: 'Julgado'
        },
        {
          id: '2', tipo: 'SUM', orgao: 'STJ', nr: 456, tese: 'Outra tese' }
      ]
    }

    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockResponse }) as any

    const tool = getPangeaTool(dummyUser)
    const result: any = await tool.execute({ query: 'precatório', page: 1 }, { toolCallId: 't1', messages: [] } as any)

    expect(result.status).toBe('OK')
    expect(result.results.length).toBe(2)
    expect(result.results[0].especie).toBe('RG')
    expect(result.results[0].numero).toBe('123')
    expect(result.results[0].tese).not.toContain('<mark>') // stripHtml default true
    expect(result.results[0].paradigmas.processos[0].numero).toBe('RE 123')
  })

  test('mantém HTML quando stripHtml=false', async () => {
    const mockResponse = {
      total: 1,
      resultados: [
        { id: '3', tipo: 'RG', orgao: 'STF', nr: 789, tese: 'Teste <mark>HTML</mark>', highlight: { tese: 'Teste <mark>HTML</mark>' } }
      ]
    }
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockResponse }) as any

    const tool = getPangeaTool(dummyUser)
    const result: any = await tool.execute({ query: 'html', page: 1, stripHtml: false }, { toolCallId: 't2', messages: [] } as any)
    expect(result.results[0].tese).toContain('<mark>HTML</mark>')
  })

  test('erro HTTP', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as any
    const tool = getPangeaTool(dummyUser)
  const result: any = await tool.execute({ query: 'falha', page: 1 }, { toolCallId: 't3', messages: [] } as any)
    expect(result.status).toBe('ERROR')
    expect(result.results.length).toBe(0)
  })

  test('valida limite de página', async () => {
    const tool = getPangeaTool(dummyUser)
  const result: any = await tool.execute({ query: 'teste', page: 11 }, { toolCallId: 't4', messages: [] } as any)
    expect(result.status).toBe('ERROR')
    expect(result.error).toMatch(/limite máximo/i)
  })

  test('valida tamanho mínimo da query (retorna ERROR)', async () => {
    const tool = getPangeaTool(dummyUser)
    const result: any = await tool.execute({ query: 'ab', page: 1 }, { toolCallId: 't5', messages: [] } as any)
    expect(result.status).toBe('ERROR')
  })
})
