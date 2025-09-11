import { isValidCPF } from '../utils/utils';
import { anonymizeNames } from './name-anonymizer';

const NUMERIC_PATTERN = /\b(?:\d[\.\-/()]?){9,20}\b/;

const NUMERO_DE_BENEFICIO_PATTERN = /\b(?:(?:NB|N\.?B\.?|Número(?: de)? Benef[ií]cio|Numero(?: de)? Beneficio)\s*(?:[:\-]?\s*)?)((?:\d\d\/)?(?:\d{3}\.?\d{3}\.?\d{3}-\d))\b/i;

const NUMERO_DE_PROCESSO_PATTERN = /\b\d{7}-?\d{2}\.?\d{4}\.?\d{1}\.?\d{2}\.?\d{4}\b/;

// Captures only the numeric part (group 1) so we can preserve the preceding label
const IDENTIDADE_PATTERN = /\b(?:Identidade|Id\.?|Ident\.?|RG\.?|RG)\s*(?:n[.º]?\.?\s*)?\s*(\d[\d.\-/]{4,8}\d)\b/i;

const CPF_PATTERN = /\b(?!\d{8,9}-\d)\d{1,3}\.?\d{3}\.?\d{3}-?\d{2}\b/;

const ENDERECO_PATTERN = /\b(?:Rua|R\.|Avenida|Av\.?|Travessa|Trav\.?|T\.|Praça|Rodovia|Rod\.?|Estrada|Estr\.?|Estr)\b\s+[^\n,]+(?:,?\s*(?:n[.ºº]?\.?\s*\d+))?/i;

const TELEFONE_FIXO_PATTERN = /\b\d{4}-?\d{4}\b/;

// Mobile phone: optional leading 1 (country/area indicator) with optional separator AFTER it, but never consume a preceding space
const TELEFONE_MOVEL_PATTERN = /\b(?:1[- ]?)?\d{4,5}[- ]?\d{4}\b/;

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;

// Simpler pattern with two groups: (label)(number)
const OAB_LABEL_NUMBER_PATTERN = /\b(OAB(?:\/[A-Z]{2}| [A-Z]{2})?:?\s*(?:n\.?|nº\.?)?\s*)(\d{2,6}(?:\.\d{3})?)\b/i;

const URL_PATTERN = /\b(?:https?|www)\.?[a-zA-Z0-9._%+-]*(?:\.[a-zA-Z0-9._%+-]+)+\b/i;

// Two groups: (label + space)(number)
const CRM_PATTERN = /\b((?:CRM(?:\/RJ|RJ|ERJ)?|CREMERJ)\s*)(\d{2,10}|\d{2,3}\.\d{3})(?:\/\?\s?[A-Z]{2})?\b/i;


/**
 * Anonymizes text by replacing sensitive information with placeholders
 * @param text The text to anonymize
 * @returns The anonymized text and the number of substitutions made
 */
export function anonymizeText(
    text: string,
    options: {
        numeric?: boolean;
        cpf?: boolean;
        identidade?: boolean;
        numeroDeProcesso?: boolean;
        numeroDeBeneficio?: boolean;
        endereco?: boolean;
        telefoneFixo?: boolean;
        telefoneMovel?: boolean;
        email?: boolean;
        oab?: boolean;
        url?: boolean;
        crm?: boolean;
        names?: boolean;
    } = {}
): { text: string; substitutions: number } {
    let currentText = text;
    let totalSubstitutions = 0;

    if (!currentText) {
        return { text: currentText, substitutions: totalSubstitutions }
    }

    const {
        numeric = true,
        cpf = true,
        identidade = true,
        numeroDeProcesso = false,
        numeroDeBeneficio = false,
        endereco = true,
        telefoneFixo = true,
        telefoneMovel = true,
        email = true,
        oab = true,
        url = true,
        crm = true,
        names = true,
    } = options;

    // Helper function to replace all matches and count them
    function replaceAndCount(pattern: RegExp, replacement: string): void {
        // Create a copy of the pattern with the global flag
        const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');

        // Count occurrences by doing replacements with a callback
        let subs = 0;
        currentText = currentText.replace(globalPattern, () => {
            subs++;
            return replacement;
        });

        totalSubstitutions += subs;
    }

    const restore = {}
    // Protect/handle Número de Benefício before any generic numeric replacements
    function protectPattern(pattern: RegExp): number {
        const globalPattern = new RegExp(
            pattern.source,
            pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'
        );
        let count = 0;
        // Start index based on existing restore entries to avoid collisions across calls
        const startIndex = Object.keys(restore).length;
        currentText = currentText.replace(globalPattern, (full) => {
            count++;
            const label = `<protect${startIndex + count}>`;
            restore[label] = full;
            return label;
        });
        return count;
    }

    if (!numeroDeProcesso) {
        protectPattern(NUMERO_DE_PROCESSO_PATTERN);
    } else {
        const globalPattern = new RegExp(NUMERO_DE_PROCESSO_PATTERN.source, NUMERO_DE_PROCESSO_PATTERN.flags.includes('g') ? NUMERO_DE_PROCESSO_PATTERN.flags : NUMERO_DE_PROCESSO_PATTERN.flags + 'g');
        let subs = 0;
        currentText = currentText.replace(globalPattern, (full, num: string) => {
            subs++;
            return full.replace(num, '000');
        });
        totalSubstitutions += subs;
    }

    if (!numeroDeBeneficio) {
        // Protect Número de Benefício occurrences so later numeric replacements don't touch them
        protectPattern(NUMERO_DE_BENEFICIO_PATTERN);
    } else {
        const globalPattern = new RegExp(NUMERO_DE_BENEFICIO_PATTERN.source, NUMERO_DE_BENEFICIO_PATTERN.flags.includes('g') ? NUMERO_DE_BENEFICIO_PATTERN.flags : NUMERO_DE_BENEFICIO_PATTERN.flags + 'g');
        let subs = 0;
        currentText = currentText.replace(globalPattern, (full, num: string) => {
            subs++;
            return full.replace(num, '000');
        });
        totalSubstitutions += subs;
    }

    if (numeric) replaceAndCount(NUMERIC_PATTERN, '000');

    if (cpf) {
        const globalPattern = new RegExp(CPF_PATTERN.source, CPF_PATTERN.flags.includes('g') ? CPF_PATTERN.flags : CPF_PATTERN.flags + 'g');
        let subs = 0;

        currentText = currentText.replace(globalPattern, (full: string) => {
            const digits = full.replace(/\D/g, '');
            if (!isValidCPF(digits)) {
                console.warn(`Invalid CPF detected: ${full}`);
                // don't replace if checksum doesn't match
                return full;
            }
            subs++;
            // preserve original punctuation/format but zero out digits
            return '000'
        });

        totalSubstitutions += subs;
    }


    // Specialized replacements that preserve labels
    if (identidade) {
        const globalPattern = new RegExp(IDENTIDADE_PATTERN.source, IDENTIDADE_PATTERN.flags.includes('g') ? IDENTIDADE_PATTERN.flags : IDENTIDADE_PATTERN.flags + 'g');
        let subs = 0;
        currentText = currentText.replace(globalPattern, (full, num: string) => {
            subs++;
            return full.replace(num, '000');
        });
        totalSubstitutions += subs;
    }

    if (endereco) replaceAndCount(ENDERECO_PATTERN, '---');
    if (telefoneFixo) replaceAndCount(TELEFONE_FIXO_PATTERN, '000');
    if (telefoneMovel) replaceAndCount(TELEFONE_MOVEL_PATTERN, '000');
    if (email) replaceAndCount(EMAIL_PATTERN, '---');
    if (oab) {
        const globalPattern = new RegExp(OAB_LABEL_NUMBER_PATTERN.source, OAB_LABEL_NUMBER_PATTERN.flags.includes('g') ? OAB_LABEL_NUMBER_PATTERN.flags : OAB_LABEL_NUMBER_PATTERN.flags + 'g');
        let subs = 0;
        currentText = currentText.replace(globalPattern, (_full, label: string, num: string) => {
            subs++;
            return label + '000';
        });
        totalSubstitutions += subs;
    }
    if (url) replaceAndCount(URL_PATTERN, '---');
    if (crm) {
        const globalPattern = new RegExp(CRM_PATTERN.source, CRM_PATTERN.flags.includes('g') ? CRM_PATTERN.flags : CRM_PATTERN.flags + 'g');
        let subs = 0;
        currentText = currentText.replace(globalPattern, (_full, label: string, num: string) => {
            subs++;
            return label + '000';
        });
        totalSubstitutions += subs;
    }

    if (names) {
        const r = anonymizeNames(currentText);
        totalSubstitutions += r.substitutions;
        currentText = r.text;
    }

    // Restore Número de Benefício occurrences if we had protected them
    for (const label in restore) {
        const full = restore[label];
        currentText = currentText.replaceAll(label, full);
    }

    return { text: currentText, substitutions: totalSubstitutions };
}

