import { removeAccents } from "../utils/utils"
import auto_json from './auto-json.md'

export const INFORMATION_EXTRACTION_TITLE = '## Instruções para o Preenchimento do JSON de Resposta'

// Tipo para representar as variáveis do prompt
export type PromptVariableType = {
    separatorName?: string // Nome do separador (usado apenas no flatten e somente na primeira variável de um grupo)
    name: string // nome sanitizado (sem [] )
    label?: string // rótulo original (pode conter [])
    type: 'object' | 'array-object' | 'string' | 'number' | 'boolean' | 'date' | 'string-long'
    description: string
    properties?: PromptVariableType[] // filhos (object) ou definição de item (array-object)
    headingLevel: number // nível do heading (3..6)
}

export const isInformationExtractionPrompt = (prompt: string): boolean => {
    if (!prompt) return false
    return prompt.includes(INFORMATION_EXTRACTION_TITLE)
}

// Função para extrair a estrutura de variáveis do markdown
export const parsePromptVariablesFromMarkdown = (md: string): PromptVariableType[] | undefined => {
    const jsonInstructionsRegex = new RegExp(`^${INFORMATION_EXTRACTION_TITLE}\\s*$`, 'gms')
    const parts = md.split(jsonInstructionsRegex)
    if (parts.length < 2) return undefined

    // Pega bloco após o título até antes do próximo heading de nível 1 ou 2
    let instructionsMd = parts[1]
    const endRegex = /(^##?\s+.+$)/gms
    const split = instructionsMd.split(endRegex)
    instructionsMd = split[0]

    const lines = instructionsMd.split(/\r?\n/)

    const headingRegex = /^(?<hashes>#{3,6})\s+(?<name>[^#].*?)\s*(?:\s+-\s+(?<label>[^\s].*[^\s]))?\s*$/
    

    const roots: PromptVariableType[] = []
    const stack: PromptVariableType[] = []

    const typeFromName = (name: string): 'string' | 'number' | 'boolean' | 'date' | 'string-long' => {
        if (/^Dt[A-Z0-9_]/.test(name)) return 'date'
        if (/^Ev[A-Z0-9_]/.test(name)) return 'string'
        if (/^Nr[A-Z0-9_]/.test(name)) return 'number'
        if (/^Lo[A-Z0-9_]/.test(name)) return 'boolean'
        if (/^Tx[A-Z0-9_]/.test(name)) return 'string'
        if (/^Tg[A-Z0-9_]/.test(name)) return 'string-long'
        const lower = name.toLowerCase()
        if (lower.includes('texto') || lower.includes('resumo') || lower.includes('conclusão')) return 'string-long'
        return 'string'
    }

    const allNodes: PromptVariableType[] = []

    let lastNode: PromptVariableType | undefined

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const headingMatch = line.match(headingRegex)
        if (headingMatch) {
            const hashes = headingMatch.groups.hashes
            const rawName = headingMatch.groups.name.trim() // parte antes de " - descrição"
            const level = hashes.length
            const rawHasArray = /\[\]$/.test(rawName)
            if (level === 6 && rawHasArray) {
                throw new Error(`Heading nível 6 não pode ser array: ${rawName}`)
            }
            const isArray = rawHasArray && level <= 5
            const baseName = rawName.replace(/\[\]$/, '')
            const name = fixVariableName(baseName)
            const displayLabel = headingMatch.groups.label || (isArray ? baseName : baseName)
            const node: PromptVariableType = {
                name,
                label: displayLabel,
                type: isArray ? 'array-object' : 'object',
                description: '',
                properties: [],
                headingLevel: level
            }

            // Empilha
            while (stack.length && stack[stack.length - 1].headingLevel >= level) {
                stack.pop()
            }
            if (stack.length === 0) {
                roots.push(node)
            } else {
                const parent = stack[stack.length - 1]
                parent.properties = parent.properties || []
                parent.properties.push(node)
            }
            stack.push(node)
            allNodes.push(node)
            lastNode = node
        } else if (line.trim() && !/^#{1,6}\s/.test(line)) {
            // Descrição: primeira linha não-heading para o último node sem descrição
            if (lastNode && !lastNode.description) {
                lastNode.description = line.trim()
            }
        }
    }

    // Ajusta tipos (field vs object) e validações
    const errors: string[] = []

    const visit = (node: PromptVariableType) => {
        if (node.type === 'array-object') {
            if (!node.properties || node.properties.length === 0) {
                errors.push(`Array "${node.label}" não possui filhos.`)
            }
        } else {
            // Diferenciar field de object
            if (node.properties && node.properties.length > 0) {
                // Se tem filhos e não era array, permanece 'object'
                node.type = 'object'
            } else {
                // Field
                node.type = typeFromName(node.name)
                delete node.properties
            }
        }
        if (node.headingLevel === 6) {
            if (node.type === 'object' || node.type === 'array-object') {
                errors.push(`Heading nível 6 deve ser variável primitiva: ${node.label}`)
            }
        }
            if (node.properties) {
            // Verifica duplicados no mesmo nível
            const seen = new Set<string>()
            for (const child of node.properties) {
                if (seen.has(child.name)) {
                    errors.push(`Nome duplicado "${child.name}" em "${node.label}".`)
                }
                seen.add(child.name)
            }
            node.properties.forEach(visit)
        }
        if (!node.description) node.description = node.name
    }

    roots.forEach(visit)

    if (errors.length) {
        throw new Error(errors.join('\n'))
    }

    return roots
}

// Flatten avançado:
// - Remove objetos (object) expondo fields e arrays (array-object) descendentes.
// - Arrays têm suas propriedades internas normalizadas: objetos internos são "abertos" (suas propriedades sobem)
//   apenas para exibição; campos primitivos permanecem; arrays aninhados permanecem.
// - separatorName atribuído somente ao primeiro item (field ou array) de cada caminho de objetos (caminho = labels dos objetos ancestrais).
// - Fields ou arrays diretamente na raiz não recebem separatorName.
export const flatternPromptVariables = (variables: PromptVariableType[] | undefined): PromptVariableType[] => {
    if (!variables || variables.length === 0) return []

    const result: PromptVariableType[] = []
    const firstEmittedForPath = new Set<string>()

    const pathKey = (objPath: string[]) => objPath.join(' > ')

    const cloneShallow = (v: PromptVariableType): PromptVariableType => ({
        name: v.name,
        label: v.label,
        type: v.type,
        description: v.description,
        headingLevel: v.headingLevel,
        properties: v.properties ? [...v.properties] : undefined
    })

    const flattenArrayProperties = (arrNode: PromptVariableType): PromptVariableType[] => {
        if (!arrNode.properties) return []
        const collected: PromptVariableType[] = []
        const dfs = (nodes: PromptVariableType[]) => {
            for (const n of nodes) {
                if (n.type === 'object' && n.properties) {
                    dfs(n.properties)
                } else if (n.type === 'array-object') {
                    // Recursivamente normaliza arrays aninhados
                    const cloned = cloneShallow(n)
                    cloned.properties = flattenArrayProperties(n)
                    collected.push(cloned)
                } else if (n.type !== 'object') { // field
                    collected.push(cloneShallow(n))
                }
            }
        }
        dfs(arrNode.properties)
        return collected
    }

    const walk = (nodes: PromptVariableType[], objectPathLabels: string[]) => {
        for (const node of nodes) {
            if (node.type === 'array-object') {
                const cloned = cloneShallow(node)
                // Normaliza propriedades internas para exibição
                cloned.properties = flattenArrayProperties(node)
                const path = pathKey(objectPathLabels)
                if (path && !firstEmittedForPath.has(path)) {
                    cloned.separatorName = path
                    firstEmittedForPath.add(path)
                }
                result.push(cloned)
                // NÃO desce além — arrays não expandem seus filhos como variáveis individuais
            } else if (node.type === 'object') {
                // Desce, acumulando caminho
                walk(node.properties || [], [...objectPathLabels, node.label || node.name])
            } else { // field
                const path = pathKey(objectPathLabels)
                const cloned = cloneShallow(node)
                if (path && !firstEmittedForPath.has(path)) {
                    cloned.separatorName = path
                    firstEmittedForPath.add(path)
                }
                result.push(cloned)
            }
        }
    }

    walk(variables, [])

    // console.log('Flattened variables:', JSON.stringify(result, null, 2))
    return result
}

const mapTypeToJsonSchema = (type: string): string => {
    switch (type) {
        case 'date':
            return 'string' // Dates are usually represented as strings in JSON
        case 'string-long':
            return 'string'
    }
    return type // For other types, return as is
}

export const promptJsonSchemaFromPromptMarkdown = (md: string, flatten: boolean = false): string | undefined => {
    let roots = parsePromptVariablesFromMarkdown(md)
    if (flatten) {
        roots = flatternPromptVariables(roots)
    }
    if (!roots || roots.length === 0) return undefined

    const nodeToSchema = (node: PromptVariableType): any => {
        if (node.type === 'array-object') {
            // items é um objeto que contém as propriedades diretas do array
            const itemsObj: any = { type: 'object', properties: {}, additionalProperties: false }
            if (node.properties) {
                for (const child of node.properties) {
                    itemsObj.properties[child.name] = nodeToSchema(child)
                }
                const req = Object.keys(itemsObj.properties)
                if (req.length) itemsObj.required = req
            }
            const arrSchema: any = { type: 'array', items: itemsObj, description: node.description }
            return arrSchema
        }
        if (node.type === 'object') {
            const obj: any = { type: 'object', properties: {}, additionalProperties: false, description: node.description }
            if (node.properties) {
                for (const child of node.properties) {
                    obj.properties[child.name] = nodeToSchema(child)
                }
                const req = Object.keys(obj.properties)
                if (req.length) obj.required = req
            }
            return obj
        }
        // field
        return { type: mapTypeToJsonSchema(node.type), description: node.description }
    }

    const properties: Record<string, any> = {}
    for (const root of roots) {
        properties[root.name] = nodeToSchema(root)
    }

    const schema: any = {
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        additionalProperties: false,
        properties
    }
    const rootReq = Object.keys(properties)
    if (rootReq.length) schema.required = rootReq

    const json = JSON.stringify(schema, null, 2)
    return json
}

function fixVariableName(name: string) {
    const fixed = removeAccents(name)
        .replace(/\s+/g, '_') // Substitui espaços por underscores
        .replace(/[^a-zA-Z0-9_.-]/g, '') // Remove caracteres inválidos
        .substring(0, 64) // Garante que o nome não exceda 64 caracteres
    return fixed
}

// Função para corrigir o prompt, substituindo o título de instruções pelo JSON auto-gerado
export function fixPromptForAutoJson(prompt: string): string {
    const titleRegex = new RegExp(`^${INFORMATION_EXTRACTION_TITLE}\\s*$`, 'gms')
    return prompt.replace(titleRegex, auto_json)
}