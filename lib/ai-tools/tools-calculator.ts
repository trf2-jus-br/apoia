import { tool } from "ai"
import { UserType } from "../user"
import { z } from "zod"
import { Parser, type Value, type Values } from "@pro-fa/expreszo"

// ============================================================================
// Utilitários de cálculo (Expreszo)
// ============================================================================
// Exportados para permitir testes diretos, sem depender do runtime do AI SDK.
//
// O Expreszo (@pro-fa/expreszo) é um parser/evaluator de expressões seguro, sem
// eval() nem execução de código arbitrário. Sucessor do expr-eval, com 60+
// funções built-in (matemática, string, array, etc.), operadores aritméticos,
// lógicos, de comparação, ternário e coalescência (??).
//
// IMPORTANTE — números fracionários:
//   Use PONTO como separador decimal (formato anglo-saxão), NUNCA vírgula.
//   Correto:    3.14, 1000.50, 0.1
//   Incorreto:  3,14, 1000,50  (a vírgula é interpretada como outro operando)
//
// Sintaxe suportada (resumo):
//   Aritmética:      + - * / % ^ ( )           ex.: 2 * (3 + 4)
//   Comparação:      == != < <= > >=           ex.: valor >= 1000
//   Lógicos:         and or not                ex.: (valor > 0) and (taxa > 0)
//   Ternário:       cond ? a : b              ex.: valor > 1000 ? 0.05 : 0.03
//   Coalescência:    ??                        ex.: aliquota ?? 0.05
//   Variáveis:       identifiers alfanuméricos ex.: principal * (1 + taxa)
//   Funções:         fn(a, b)                  ex.: round(valor * 100) / 100
//   CASE (SQL):      CASE WHEN ... THEN ... ELSE ... END
//
// Documentação completa: https://pro-fa.github.io/expreszo-typescript/docs/

/**
 * Instância única (estática) do parser completo. O parser é stateless após a
 * construção (operadores/funções são registrados uma vez), então pode ser
 * compartilhado entre chamadas concorrentes com segurança.
 */
const parser = new Parser()

/**
 * Avalia uma única expressão usando a sintaxe do Expreszo.
 *
 * O resultado é sempre síncrono com o parser padrão (nenhuma função assíncrona
 * customizada é registrada), por isso o retorno (potencialmente Promise<Value>)
 * é resolvido para `Value`. Se funções async forem registradas no futuro, este
 * helper precisará tornar-se async.
 *
 * @param expression  A expressão a ser avaliada (ex.: "2 * (3 + 4)", "price * qty").
 * @param variables   Mapa de variáveis opcionais (ex.: { price: 100, qty: 3 }).
 * @returns           O resultado: número, string, booleano, array, objeto, etc.
 * @throws            Error com mensagem descritiva em caso de erro de parse ou avaliação.
 */
export const evaluateExpression = (
    expression: string,
    variables?: Values,
): Value => {
    try {
        const out = parser.evaluate(expression, variables)
        // Com o parser padrão (sem funções async), evaluate nunca retorna Promise;
        // guarded contra regressão futura.
        if (out instanceof Promise) {
            throw new Error('Avaliação assíncrona não é suportada por esta tool.')
        }
        return out
    } catch (error) {
        // Re-embalça a mensagem para incluir a expressão, facilitando o diagnóstico.
        const detail = error instanceof Error ? error.message : String(error)
        throw new Error(`Falha ao avaliar a expressão "${expression}": ${detail}`)
    }
}

/**
 * Avalia um lote de expressões em uma única chamada, retornando um array de
 * resultados na mesma ordem. O use case é otimizar interações do modelo: em vez
 * de N chamadas consecutivas ao tool, o modelo envia N expressões de uma vez.
 *
 * Cada item pode especificar suas próprias variáveis; quando ausentes, usa-se
 * o `defaultVariables` (ou nenhum). Variáveis por-item fazem merge por cima das
 * defaults (mais específico sobrescreve).
 *
 * Expressões inválidas NÃO abortam o lote inteiro: cada item com erro recebe
 * `{ error: string }` em vez de `{ result: any }`, preservando a versão do input.
 */
export const evaluateBatch = (
    items: ReadonlyArray<{ expression: string; variables?: Values }>,
    defaultVariables?: Values,
): Array<{ result?: Value; error?: string }> => {
    return items.map(({ expression, variables }) => {
        try {
            const merged = variables
                ? { ...defaultVariables, ...variables }
                : defaultVariables
            const result = evaluateExpression(expression, merged)
            return { result }
        } catch (error) {
            return { error: error instanceof Error ? error.message : String(error) }
        }
    })
}

// ============================================================================
// Tool (AI SDK)
// ============================================================================

const variablesSchema = z
    .record(z.string(), z.union([z.number(), z.string(), z.boolean(), z.null()]))
    .optional()
    .describe(
        'Mapa opcional de variáveis nomeadas para usar na expressão. ' +
        'Ex.: { "price": 100, "qty": 3, "discount": 0.2 }. ' +
        'Valores podem ser número, string, booleano ou null.'
    )

/**
 * Tool que avalia um lote de expressões matemáticas usando a sintaxe do Expreszo.
 * Cada item do array de entrada contém uma `expression` e, opcionalmente, `variables`
 * específicas. O retorno é um array de objetos (mesma ordem), cada um com `result`
 * (em sucesso) ou `error` (em falha) — assim, erros pontuais não invalidam o lote.
 *
 * O uso de lote é propositalmente mais eficiente do que várias chamadas do modelo.
 */
export const getCalculatorTool = (pUser: Promise<UserType>) => tool({
    description:
        'Avalia um ou mais cálculos matemáticos em lote usando a sintaxe do Expreszo. ' +
        'Use PONTO como separador decimal (ex.: 3.14), NUNCA vírgula. ' +
        'Sintaxe: aritmética (+ - * / % ^), comparação (== != < <= > >=), lógicos (and, or, not), ' +
        'ternário (cond ? a : b), coalescência (??) e mais de 60 funções. ' +
        'Funções úteis para cálculos financeiros e de datas: ' +
        'round(x) (arredonda para inteiro; para N casas use round(x*10^N)/10^N), ' +
        'floor(x), ceil(x), abs(x), min(...), max(...), pow(base, exp), sqrt(x), log(x). ' +
        'Exemplos financeiros: "principal * (1 + taxa)^meses", "valor / parcelas", ' +
        '"round(multa * 100) / 100", "valor * (aliquota ?? 0.05)". ' +
        'Exemplos com datas (dias/UX): "dias * valor_diario", "horas * valor_hora * (fator ?? 1)". ' +
        'Para cada item, forneça uma expressão e, opcionalmente, variáveis nomeadas. ' +
        'O retorno é um array (mesma ordem) com `{ result }` em sucesso ou `{ error }` em falha. ' +
        'Enviar múltiplas expressões em um único lote é mais eficiente do que várias chamadas separadas. ' +
        'Documentação completa: https://pro-fa.github.io/expreszo-typescript/docs/',
    inputSchema: z.object({
        items: z
            .array(
                z.object({
                    expression: z
                        .string()
                        .min(1)
                        .describe('A expressão a ser avaliada. Use ponto como separador decimal (ex.: 3.14). Ex.: "2 * (3 + 4)", "principal * (1 + taxa)^meses", "round(multa * 100) / 100".'),
                    variables: variablesSchema,
                })
            )
            .min(1)
            .describe('Lista de cálculos a executar. Cada item tem `expression` (obrigatório) e `variables` (opcional).'),
        defaultVariables: variablesSchema.describe(
            'Variáveis padrão aplicadas a todos os itens do lote. ' +
            'Variáveis por-item (em `items[].variables`) sobrescrevem estas quando há conflito de nome.'
        ),
    }),
    execute: async ({ items, defaultVariables }) => {
        try {
            // inputSchema garante que cada item tem `expression` (string não vazia).
            const results = evaluateBatch(
                items as ReadonlyArray<{ expression: string; variables?: Values }>,
                defaultVariables,
            )
            return { results }
        } catch (error) {
            console.error('Error executing getCalculatorTool:', error)
            return {
                results: [],
                error: error instanceof Error ? error.message : 'erro desconhecido',
            }
        }
    },
})
