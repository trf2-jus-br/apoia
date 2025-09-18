import { extractProcessNumbers } from '@/lib/utils/process';

describe('extractProcessNumbers', () => {
    test('extracts a formatted CNJ number and strips non-digits', () => {
        const text = 'Processo: 0000000-00.0000.0.00.0000';
        const result = extractProcessNumbers(text);
        expect(result).toBe('00000000000000000000');
    });

    test('extracts raw 20-digit numbers', () => {
        const text = 'IDs: 12345678901234567890 and 00000000000000000000';
        const result = extractProcessNumbers(text);
        expect(result).toBe('12345678901234567890, 00000000000000000000');
    });

    test('returns empty string when no process numbers are present', () => {
        const text = 'No process numbers here';
        const result = extractProcessNumbers(text);
        expect(result).toBe('');
    });

    test('handles multiple formatted numbers', () => {
        const text = 'A 0000000-00.0000.0.00.0000; B 1111111-11.1111.1.11.1111';
        const result = extractProcessNumbers(text);
        expect(result).toBe('00000000000000000000, 11111111111111111111');
    });
});
