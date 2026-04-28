// npm test --silent -- auto-json.test.ts

import { INFORMATION_EXTRACTION_TITLE, parsePromptVariablesFromMarkdown, flatternPromptVariables, promptJsonSchemaFromPromptMarkdown } from '@/lib/ai/auto-json'

// Helper to build a full markdown prompt block
function build(md: string) {
  return `${INFORMATION_EXTRACTION_TITLE}\n\n${md}`
}

describe('auto-json parser & schema', () => {
  test('root primitive field at level 3', () => {
    const md = build(`### NmParte\nDescrição do nome da parte`)
    const roots = parsePromptVariablesFromMarkdown(md)!
    expect(roots).toHaveLength(1)
    const field = roots[0]
    expect(field.type).toBe('string')
    expect(field.name).toBe('NmParte')
    const flat = flatternPromptVariables(roots)
    expect(flat).toHaveLength(1)
    expect(flat[0].separatorName).toBeUndefined()
  })

  test('object with nested fields and separatorName only on first field', () => {
    const md = build(`### Processo\nObjeto processo\n#### Juizo\n##### NmJuizo\n##### DtDistribuicao`)
    const roots = parsePromptVariablesFromMarkdown(md)!
    expect(roots[0].type).toBe('object')
    const flat = flatternPromptVariables(roots)
    // Two primitive fields extracted, order preserved
    expect(flat.map(f => f.name)).toEqual(['NmJuizo', 'DtDistribuicao'])
    // First gets separatorName (Processo > Juizo)
    expect(flat[0].separatorName).toBe('Processo > Juizo')
    // Second does not repeat separatorName
    expect(flat[1].separatorName).toBeUndefined()
  })

  test('array inside object with wrapper object', () => {
    const md = build(`### Processo\n#### Partes[]\n##### Parte\n###### NmParte\n###### TpParte`)
    const roots = parsePromptVariablesFromMarkdown(md)!
    const processo = roots[0]
    expect(processo.type).toBe('object')
    const partesArray = processo.properties!.find(p => p.name === 'Partes')!
    expect(partesArray.type).toBe('array-object')
    // Wrapper retained (Parte) under array (for schema)
    expect(partesArray.properties!.some(p => p.name === 'Parte')).toBe(true)

    const flat = flatternPromptVariables(roots)
    // Flatten should contain only the array (with its internal primitive fields exposed in properties) and no primitive fields directly (since none outside array)
    expect(flat).toHaveLength(1)
    expect(flat[0].type).toBe('array-object')
    expect(flat[0].properties!.map(p => p.name).sort()).toEqual(['NmParte','TpParte'])
    expect(flat[0].separatorName).toBe('Processo')
  })

  test('root level array', () => {
    const md = build(`### Movimentacoes[]\n#### Mov\n##### DtMov\n##### TxDescricao`)
    const roots = parsePromptVariablesFromMarkdown(md)!
    const arr = roots[0]
    expect(arr.type).toBe('array-object')
    const flat = flatternPromptVariables(roots)
    expect(flat).toHaveLength(1)
    expect(flat[0].separatorName).toBeUndefined()
  })

  test('array with direct primitive fields (implicit item object)', () => {
    const md = build(`### Partes[]\n#### NmParte\n#### TpParte`)
    const roots = parsePromptVariablesFromMarkdown(md)!
    const arr = roots[0]
    expect(arr.type).toBe('array-object')
    // Direct primitive children under array
    expect(arr.properties && arr.properties.length).toBe(2)
    const schemaJson = promptJsonSchemaFromPromptMarkdown(md)!
    const schema = JSON.parse(schemaJson)
    expect(schema.properties.Partes.type).toBe('array')
    expect(schema.properties.Partes.items.properties.NmParte.type).toBe('string')
  })

  test('json schema integration for mixed structure', () => {
    const md = build(`### Processo\n#### Juizo\n##### NmJuizo\n##### DtDistribuicao\n#### Partes[]\n##### Parte\n###### NmParte\n###### TpParte\n### Movimentacoes[]\n#### Mov\n##### DtMov`)
    const schemaJson = promptJsonSchemaFromPromptMarkdown(md)!
    const schema = JSON.parse(schemaJson)
    expect(schema.type).toBe('object')
    expect(schema.properties.Processo.properties.Partes.type).toBe('array')
    expect(schema.properties.Movimentacoes.type).toBe('array')
  })

  test('error on level 6 array', () => {
    const md = build(`### Processo\n###### Campos[]`)
    expect(() => parsePromptVariablesFromMarkdown(md)).toThrow(/nível 6/i)
  })

  test('duplicate names in same scope', () => {
    const md = build(`### Processo\n#### Juizo\n##### NmJuizo\n##### NmJuizo`)
    expect(() => parsePromptVariablesFromMarkdown(md)).toThrow(/duplicado/i)
  })

  test('nested array inside array (implicit item for inner array)', () => {
    const md = build(`### Processo\n#### Partes[]\n##### Parte\n###### NmParte\n###### TpParte\n##### Documentos[]\n###### NmDocumento\n###### DtDocumento`)
    const roots = parsePromptVariablesFromMarkdown(md)!
    const processo = roots[0]
    const partes = processo.properties!.find(p => p.name === 'Partes')!
    expect(partes.type).toBe('array-object')
    // Inner array
    const documentos = partes.properties!.find(p => p.name === 'Documentos')!
    expect(documentos.type).toBe('array-object')
    // Inner array fields
    expect(documentos.properties!.map(p => p.name).sort()).toEqual(['DtDocumento','NmDocumento'])
    // Flatten: should produce only array-object nodes (Partes) at root path and NOT inner array separately (inner array appears as nested property of Partes)
    const flat = flatternPromptVariables(roots)
    const partesFlat = flat.find(f => f.name === 'Partes')!
    expect(partesFlat.properties!.some(p => p.name === 'Documentos')).toBe(true)
    const documentosFlat = partesFlat.properties!.find(p => p.name === 'Documentos')!
    expect(documentosFlat.type).toBe('array-object')
    expect(documentosFlat.properties!.map(p => p.name).sort()).toEqual(['DtDocumento','NmDocumento'])
    const schema = JSON.parse(promptJsonSchemaFromPromptMarkdown(md)!)
    expect(schema.properties.Processo.properties.Partes.items.properties.Documentos.type).toBe('array')
  })

  test('multi-path separatorName only once per path', () => {
    const md = build(`### Processo\n#### Juizo\n##### NmJuizo\n##### DtDistribuicao\n#### Vara\n##### NmVara\n##### DtInstalacao`)
    const roots = parsePromptVariablesFromMarkdown(md)!
    const flat = flatternPromptVariables(roots)
    const juizoVars = flat.filter(f => ['NmJuizo','DtDistribuicao'].includes(f.name))
    expect(juizoVars[0].separatorName).toBe('Processo > Juizo')
    expect(juizoVars[1].separatorName).toBeUndefined()
    const varaVars = flat.filter(f => ['NmVara','DtInstalacao'].includes(f.name))
    expect(varaVars[0].separatorName).toBe('Processo > Vara')
    expect(varaVars[1].separatorName).toBeUndefined()
  })

  test('array with wrapper and sibling primitive field', () => {
    const md = build(`### Itens[]\n#### Item\n##### NmItem\n#### Codigo`)
    const roots = parsePromptVariablesFromMarkdown(md)!
    const itens = roots[0]
    expect(itens.type).toBe('array-object')
    // properties include the wrapper object and the field sibling
    const names = itens.properties!.map(p => p.name).sort()
    expect(names).toEqual(['Codigo','Item'])
    const schema = JSON.parse(promptJsonSchemaFromPromptMarkdown(md)!)
    expect(schema.properties.Itens.items.properties.Codigo.type).toBe('string')
  })

  test('duplicate names inside array item scope triggers error', () => {
    const md = build(`### Partes[]\n#### NmParte\n#### NmParte`)
    expect(() => parsePromptVariablesFromMarkdown(md)).toThrow(/duplicado/i)
  })

  // ---------------- Schema Snapshot Tests ----------------
  test('schema snapshot: mixed objects and arrays', () => {
    const md = build(`### Processo\n#### Juizo\n##### NmJuizo\n##### DtDistribuicao\n#### Partes[]\n##### Parte\n###### NmParte\n###### TpParte\n### Movimentacoes[]\n#### Mov\n##### DtMov`)
    const schemaJson = promptJsonSchemaFromPromptMarkdown(md)!
    const schema = JSON.parse(schemaJson)
    expect(schema).toEqual({
      $schema: 'http://json-schema.org/draft-04/schema#',
      type: 'object',
      additionalProperties: false,
      properties: {
        Processo: {
          type: 'object',
            additionalProperties: false,
            properties: {
              Juizo: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  NmJuizo: { type: 'string' },
                  DtDistribuicao: { type: 'string' }
                },
                required: ['NmJuizo','DtDistribuicao']
              },
              Partes: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    Parte: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        NmParte: { type: 'string' },
                        TpParte: { type: 'string' }
                      },
                      required: ['NmParte','TpParte']
                    }
                  },
                  required: ['Parte']
                }
              }
            },
            required: ['Juizo','Partes']
        },
        Movimentacoes: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              Mov: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  DtMov: { type: 'string' }
                },
                required: ['DtMov']
              }
            },
            required: ['Mov']
          }
        }
      },
      required: ['Processo','Movimentacoes']
    })
  })

  test('schema snapshot: array with direct primitive fields', () => {
    const md = build(`### Partes[]\n#### NmParte\n#### TpParte`)
    const schema = JSON.parse(promptJsonSchemaFromPromptMarkdown(md)!)
    expect(schema).toEqual({
      $schema: 'http://json-schema.org/draft-04/schema#',
      type: 'object',
      additionalProperties: false,
      properties: {
        Partes: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              NmParte: { type: 'string' },
              TpParte: { type: 'string' }
            },
            required: ['NmParte','TpParte']
          }
        }
      },
      required: ['Partes']
    })
  })

  test('schema snapshot: nested arrays within array', () => {
    const md = build(`### Processo\n#### Partes[]\n##### Parte\n###### NmParte\n#### Documentos[]\n##### Documento\n###### NmDocumento`)
    const schema = JSON.parse(promptJsonSchemaFromPromptMarkdown(md)!)
    // Processo object with Partes array and Documentos array side by side
    expect(schema.properties.Processo.properties.Partes.type).toBe('array')
    expect(schema.properties.Processo.properties.Documentos.type).toBe('array')
    // Inner wrapper object retained
    expect(schema.properties.Processo.properties.Partes.items.properties.Parte).toBeDefined()
    expect(schema.properties.Processo.properties.Documentos.items.properties.Documento).toBeDefined()
  })
})
