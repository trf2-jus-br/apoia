// npm test -- tools-date.test.ts
//
// Tests for the date utilities exported from lib/ai-tools/tools-date.ts:
// - parseBrDate: parsing/validating DD/MM/YYYY strings
// - formatBrDate: formatting a Date as DD/MM/YYYY
// - addYMD: adding positive/zero/negative years, months and days
// - calendarDiff: chronological calendar decomposition between two dates
// - formatDuration: pretty-printing {anos, meses, dias} always partial-aware

import {
    parseBrDate,
    formatBrDate,
    addYMD,
    calendarDiff,
    formatDuration,
} from '@/lib/ai-tools/tools-date'

describe('parseBrDate', () => {
    test('parses a valid date DD/MM/YYYY', () => {
        const d = parseBrDate('15/03/2024')
        expect(d.getFullYear()).toBe(2024)
        expect(d.getMonth()).toBe(2) // March
        expect(d.getDate()).toBe(15)
    })

    test.each([
        '2024-03-15', // ISO
        '15-03-2024',
        '15/3/2024',  // zero padding required
        '1/03/2024',
        '',
        'foo',
        '32/01/2024', // day overflow
        '15/13/2024', // month overflow
    ])('rejects invalid format/value "%s"', (value) => {
        expect(() => parseBrDate(value)).toThrow()
    })

    test('rejects a non-existent calendar date (31/02)', () => {
        // 31/02 clamps to 02/03 — must be flagged as non-existent
        expect(() => parseBrDate('31/02/2024')).toThrow(/inexistente/i)
    })

    test('parses leap day', () => {
        const d = parseBrDate('29/02/2024')
        expect(d.getMonth()).toBe(1)
        expect(d.getDate()).toBe(29)
    })

    test('rejects Feb 29 in a non-leap year', () => {
        expect(() => parseBrDate('29/02/2023')).toThrow(/inexistente/i)
    })
})

describe('formatBrDate', () => {
    test('formats a date with zero padding', () => {
        expect(formatBrDate(new Date(2024, 2, 15))).toBe('15/03/2024')
        expect(formatBrDate(new Date(2024, 0, 5))).toBe('05/01/2024')
        expect(formatBrDate(new Date(2024, 10, 9))).toBe('09/11/2024')
    })

    test('round-trips through parseBrDate', () => {
        expect(formatBrDate(parseBrDate('07/12/1999'))).toBe('07/12/1999')
    })
})

describe('addYMD', () => {
    test('adds zero components (keeps the date)', () => {
        expect(formatBrDate(addYMD(parseBrDate('10/05/2024'), 0, 0, 0))).toBe('10/05/2024')
    })

    test('adds years, months and days', () => {
        expect(formatBrDate(addYMD(parseBrDate('10/05/2024'), 1, 2, 5))).toBe('15/07/2025')
    })

    test('clamps day 31 of a long month into a short month', () => {
        // 31/01/2024 + 1 month -> not 31/02 (invalid), clamp to 29/02/2024 (leap year)
        expect(formatBrDate(addYMD(parseBrDate('31/01/2024'), 0, 1, 0))).toBe('29/02/2024')
    })

    test('handles negative months', () => {
        expect(formatBrDate(addYMD(parseBrDate('15/03/2024'), 0, -1, 0))).toBe('15/02/2024')
    })

    test('handles negative days', () => {
        expect(formatBrDate(addYMD(parseBrDate('01/03/2024'), 0, 0, -1))).toBe('29/02/2024')
    })

    test('handles negative years', () => {
        expect(formatBrDate(addYMD(parseBrDate('10/05/2024'), -1, 0, 0))).toBe('10/05/2023')
    })

    test('combines negative components', () => {
        expect(formatBrDate(addYMD(parseBrDate('15/03/2024'), -1, -2, -5))).toBe('10/01/2023')
    })
})

describe('calendarDiff', () => {
    test('computes full years residual months and days', () => {
        // 01/01/2020 -> 15/04/2024 = 4 years, 3 months, 14 days
        const r = calendarDiff(parseBrDate('01/01/2020'), parseBrDate('15/04/2024'))
        expect(r.anos).toBe(4)
        expect(r.meses).toBe(3)
        expect(r.dias).toBe(14)
        expect(r.negativo).toBe(false)
    })

    test('returns 0 when dates are equal', () => {
        const r = calendarDiff(parseBrDate('10/05/2024'), parseBrDate('10/05/2024'))
        expect(r.anos).toBe(0)
        expect(r.meses).toBe(0)
        expect(r.dias).toBe(0)
    })

    test('flips and marks negative when from > to', () => {
        const r = calendarDiff(parseBrDate('15/04/2024'), parseBrDate('01/01/2020'))
        expect(r.anos).toBe(4)
        expect(r.meses).toBe(3)
        expect(r.dias).toBe(14)
        expect(r.negativo).toBe(true)
    })

    test('less than a month counts only days', () => {
        const r = calendarDiff(parseBrDate('01/01/2024'), parseBrDate('20/01/2024'))
        expect(r.anos).toBe(0)
        expect(r.meses).toBe(0)
        expect(r.dias).toBe(19)
    })

    test('counts a short month as a full month', () => {
        // February (29 days in leap year) still counts as 1 full month.
        // 01/01/2024 -> 01/03/2024 = exactly 2 months, 0 days.
        const r = calendarDiff(parseBrDate('01/01/2024'), parseBrDate('01/03/2024'))
        expect(r.anos).toBe(0)
        expect(r.meses).toBe(2)
        expect(r.dias).toBe(0)
    })

    test('handles end-of-month clamp in diff', () => {
        // 31/01/2024 + 1 month clamps to 29/02/2024 (leap), which is <= 01/03/2024,
        // so the algorithm counts 1 month and 1 day (not 29 days).
        const r = calendarDiff(parseBrDate('31/01/2024'), parseBrDate('01/03/2024'))
        expect(r.anos).toBe(0)
        expect(r.meses).toBe(1)
        expect(r.dias).toBe(1)
    })
})

describe('formatDuration', () => {
    test('omits zero components', () => {
        expect(formatDuration({ anos: 0, meses: 2, dias: 0 })).toBe('2 meses')
        expect(formatDuration({ anos: 1, meses: 0, dias: 0 })).toBe('1 ano')
    })

    test('singular vs plural', () => {
        expect(formatDuration({ anos: 1, meses: 1, dias: 1 })).toBe('1 ano, 1 mês e 1 dia')
        expect(formatDuration({ anos: 2, meses: 3, dias: 4 })).toBe('2 anos, 3 meses e 4 dias')
    })

    test('uses "e" to join the last segment', () => {
        const txt = formatDuration({ anos: 1, meses: 2, dias: 3 })
        // Last two segments are joined by " e " instead of ", "
        expect(txt).toMatch(/meses e 3 dias$/)
        expect(txt).toBe('1 ano, 2 meses e 3 dias')
    })

    test('two-segment uses "e"', () => {
        expect(formatDuration({ anos: 0, meses: 2, dias: 3 })).toBe('2 meses e 3 dias')
    })

    test('all zero returns "0 dia"', () => {
        expect(formatDuration({ anos: 0, meses: 0, dias: 0 })).toBe('0 dia')
    })

    test('negative sign prefix', () => {
        expect(formatDuration({ anos: 1, meses: 0, dias: 0, negativo: true })).toBe('-1 ano')
        expect(formatDuration({ anos: 2, meses: 3, dias: 0, negativo: true })).toBe('-2 anos e 3 meses')
    })
})
