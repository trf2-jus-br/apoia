// npm test -- tools-calculator.test.ts
//
// Tests for the expression utilities exported from lib/ai-tools/tools-calculator.ts:
// - evaluateExpression: single Expreszo expression evaluation
// - evaluateBatch: batch evaluation with per-item error isolation

import { evaluateExpression, evaluateBatch } from '@/lib/ai-tools/tools-calculator'

describe('evaluateExpression', () => {
    test('basic arithmetic', () => {
        expect(evaluateExpression('2 + 3')).toBe(5)
        expect(evaluateExpression('2 * (3 + 4)')).toBe(14)
        expect(evaluateExpression('10 / 4')).toBe(2.5)
        expect(evaluateExpression('10 % 3')).toBe(1)
        expect(evaluateExpression('2 ^ 10')).toBe(1024)
    })

    test('negative numbers and precedence', () => {
        expect(evaluateExpression('-5 + 3')).toBe(-2)
        expect(evaluateExpression('2 * -3')).toBe(-6)
        // Expreszo follows standard math precedence: ^ binds tighter than unary -,
        // so -2^2 is -(2^2) = -4, as in most languages and calculators.
        expect(evaluateExpression('-2 ^ 2')).toBe(-4)
        // Use parens to square a negative number.
        expect(evaluateExpression('(-2) ^ 2')).toBe(4)
    })

    test('comparison operators', () => {
        expect(evaluateExpression('5 > 3')).toBe(true)
        expect(evaluateExpression('5 < 3')).toBe(false)
        expect(evaluateExpression('5 == 5')).toBe(true)
        expect(evaluateExpression('5 != 5')).toBe(false)
        expect(evaluateExpression('5 >= 5')).toBe(true)
        expect(evaluateExpression('5 <= 4')).toBe(false)
    })

    test('logical operators', () => {
        expect(evaluateExpression('true and false')).toBe(false)
        expect(evaluateExpression('true or false')).toBe(true)
        expect(evaluateExpression('not true')).toBe(false)
        expect(evaluateExpression('(5 > 3) and (2 < 4)')).toBe(true)
    })

    test('ternary', () => {
        expect(evaluateExpression('5 > 3 ? 100 : 200')).toBe(100)
        expect(evaluateExpression('5 < 3 ? 100 : 200')).toBe(200)
    })

    test('built-in functions', () => {
        // round() takes a single argument and rounds to the nearest integer.
        expect(evaluateExpression('round(10 / 3)')).toBe(3)
        // To round to N decimal places, use the round(x * 10^N) / 10^N idiom.
        expect(evaluateExpression('round(10 / 3 * 100) / 100')).toBe(3.33)
        expect(evaluateExpression('floor(3.9)')).toBe(3)
        expect(evaluateExpression('ceil(3.1)')).toBe(4)
        expect(evaluateExpression('abs(-7)')).toBe(7)
        expect(evaluateExpression('sqrt(16)')).toBe(4)
        expect(evaluateExpression('max(1, 5, 3)')).toBe(5)
        expect(evaluateExpression('min(1, 5, 3)')).toBe(1)
    })

    test('variables are substituted', () => {
        expect(evaluateExpression('price * qty', { price: 100, qty: 3 })).toBe(300)
        expect(evaluateExpression('price * (1 - discount)', { price: 100, discount: 0.2 })).toBe(80)
    })

    test('uses dot as decimal separator (never comma)', () => {
        // Portuguese-BR habit is to write 3,14 — but Expreszo requires 3.14
        expect(evaluateExpression('3.14 * 2')).toBeCloseTo(6.28, 2)
        // Comma is NOT a decimal separator; it will either error or be parsed as two operands
        expect(() => evaluateExpression('3,14')).toThrow()
    })

    test('percentage-style expressions', () => {
        expect(evaluateExpression('1000 * 15 / 100')).toBe(150)
        expect(evaluateExpression('500 + (500 * 0.1)')).toBe(550)
    })

    test.each([
        '',                  // empty
        '2 +',              // incomplete
        'foo(',             // unclosed call
        '2 ** 3',           // unsupported operator
        '2 + (3 * 4',       // unbalanced parens
    ])('throws on invalid expression %s', (expr) => {
        expect(() => evaluateExpression(expr)).toThrow()
    })

    test('accepts repeated unary signs as valid', () => {
        // Expreszo treats 2 + + + + 3 as 2 + (+3) = 5 — a series of unary operators.
        expect(evaluateExpression('2 + + + + 3')).toBe(5)
    })

    test('throws when a referenced variable is missing', () => {
        expect(() => evaluateExpression('price * 2')).toThrow()
    })

    test('rejects prototype-polluting access', () => {
        // Safe by default: __proto__/constructor must be blocked
        expect(() => evaluateExpression('constructor')).toThrow()
        expect(() => evaluateExpression('__proto__')).toThrow()
    })

    test('real-world legal calc: correção monetária simples', () => {
        // valor * (1 + taxa) ^ meses
        const r = evaluateExpression('valor * (1 + taxa) ^ meses', { valor: 1000, taxa: 0.01, meses: 12 })
        expect(r).toBeCloseTo(1126.83, 1)
    })

    test('honorários sucumbenciais sobre o valor da causa', () => {
        // 10% a 20% do valor da causa, conforme artifio 85, §2º, CPC
        const baixo = evaluateExpression('valor * 0.10', { valor: 50000 })
        const alto = evaluateExpression('valor * 0.20', { valor: 50000 })
        expect(baixo).toBe(5000)
        expect(alto).toBe(10000)
    })

    test('prazo processual em dias úteis com carência', () => {
        // 15 dias úteis a partir de hoje + 3 dias (intimação) = total de dias corridos
        const total = evaluateExpression('dias_uteis + carencia', { dias_uteis: 15, carencia: 3 })
        expect(total).toBe(18)
    })

    test('multa diária (astreintes) acumulada', () => {
        // multa_diaria * dias_em_atraso, arredondada para 2 casas
        const r = evaluateExpression('round(multa * dias * 100) / 100', { multa: 50.5, dias: 30 })
        expect(r).toBe(1515)
    })

    test('atualização monetária pela SELIC acumulada', () => {
        // principal * produto_dos_fatores_selic, com fatores mensais já computados
        const atualizado = evaluateExpression('principal * fator_acumulado', {
            principal: 10000,
            fator_acumulado: 1.0835,
        })
        expect(atualizado).toBeCloseTo(10835, 0)
    })
})

describe('evaluateBatch', () => {
    test('returns results in the same order', () => {
        const items = [
            { expression: '1 + 1' },
            { expression: '2 * 2' },
            { expression: '10 - 3' },
        ]
        const r = evaluateBatch(items)
        expect(r).toHaveLength(3)
        expect(r[0].result).toBe(2)
        expect(r[1].result).toBe(4)
        expect(r[2].result).toBe(7)
    })

    test('applies defaultVariables to all items', () => {
        const r = evaluateBatch(
            [{ expression: 'x * 2' }, { expression: 'x + 10' }],
            { x: 5 },
        )
        expect(r[0].result).toBe(10)
        expect(r[1].result).toBe(15)
    })

    test('per-item variables override defaults', () => {
        const r = evaluateBatch(
            [
                { expression: 'x' },
                { expression: 'x', variables: { x: 99 } },
            ],
            { x: 1 },
        )
        expect(r[0].result).toBe(1)
        expect(r[1].result).toBe(99)
    })

    test('per-item error does NOT abort the batch', () => {
        const r = evaluateBatch([
            { expression: '1 / 0' },    // may be Infinity or error depending on config
            { expression: 'foo +' },    // parse error
            { expression: '2 + 2' },    // ok
        ])
        expect(r).toHaveLength(3)
        // The last one must succeed regardless of earlier failures
        expect(r[2].result).toBe(4)
        // The parse error must be captured as { error }
        expect(r[1].error).toBeTruthy()
    })

    test('error result preserves the input context', () => {
        const r = evaluateBatch([{ expression: 'bad +' }])
        expect(r[0].error).toMatch(/bad \+/)
    })

    test('empty batch returns empty array', () => {
        expect(evaluateBatch([])).toEqual([])
    })

    test('mixed valid/invalid items', () => {
        const r = evaluateBatch([
            { expression: 'max(1, 2, 3)' },
            { expression: 'missing_var' },
            // round to 2 decimal places using the standard idiom.
            { expression: 'round(3.14159 * 100) / 100' },
        ])
        expect(r[0].result).toBe(3)
        expect(r[1].error).toBeTruthy()
        expect(r[2].result).toBe(3.14)
    })
})
