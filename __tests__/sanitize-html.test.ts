import { describe, expect, test, jest } from '@jest/globals';

// server-only lança quando importado fora do contexto react-server e não é
// resolvível fora do bundler do Next; mock virtual permite importar o módulo
// server-side (sanitize-html-server) nos testes
jest.mock('server-only', () => ({}), { virtual: true });

import { sanitizeHtmlServer } from '../lib/utils/sanitize-html-server';
import { escapeHtml, sanitizeHtml } from '../lib/ui/sanitize-html';

describe('sanitizeHtmlServer', () => {
    test('remove tags de script', () => {
        const out = sanitizeHtmlServer('<p>ok</p><script>alert(1)</script>');
        expect(out).toContain('<p>ok</p>');
        expect(out).not.toContain('<script');
    });

    test('remove handlers de evento', () => {
        const out = sanitizeHtmlServer('<img src="x" onerror="alert(1)">');
        expect(out).toContain('<img');
        expect(out).not.toContain('onerror');
    });

    test('remove svg/iframe/style/form', () => {
        expect(sanitizeHtmlServer('<svg onload="alert(1)"><circle/></svg>')).not.toContain('<svg');
        expect(sanitizeHtmlServer('<iframe src="https://evil"></iframe>')).not.toContain('<iframe');
        expect(sanitizeHtmlServer('<style>body{}</style>')).not.toContain('<style');
        expect(sanitizeHtmlServer('<form action="x"></form>')).not.toContain('<form');
    });

    test('remove URIs javascript:', () => {
        const out = sanitizeHtmlServer('<a href="javascript:alert(1)">clique</a>');
        expect(out).toContain('clique');
        expect(out).not.toContain('javascript:');
    });

    test('neutraliza breakout de atributo em title', () => {
        const out = sanitizeHtmlServer('<span class="citacao" title="ok"><img src="x" onerror="alert(1)"></span>');
        expect(out).toContain('title="ok"');
        expect(out).not.toContain('onerror');
    });

    test('preserva markup legítimo: ins/del de diff com class e title', () => {
        const out = sanitizeHtmlServer('<ins class="diffins" title="origem">texto</ins><del class="diffdel">antigo</del>');
        expect(out).toContain('<ins class="diffins" title="origem">');
        expect(out).toContain('<del class="diffdel">');
    });

    test('preserva markup legítimo: span de link de peça com data-*', () => {
        const out = sanitizeHtmlServer('<span class="widgetlinkdocumento" data-idpiece="INIC1_1" data-numprocesso="123" data-target="_blank">evento 1, INIC1</span>');
        expect(out).toContain('class="widgetlinkdocumento"');
        expect(out).toContain('data-idpiece="INIC1_1"');
        expect(out).toContain('data-numprocesso="123"');
    });

    test('preserva markup legítimo: tabelas com classes bootstrap e span do cursor', () => {
        const out = sanitizeHtmlServer('<table class="table table-striped table-info table-sm"><thead class="table-dark"><tr><th>#</th></tr></thead></table><span class="blinking-cursor">&#x25FE;</span>');
        expect(out).toContain('class="table table-striped table-info table-sm"');
        expect(out).toContain('class="blinking-cursor"');
    });

    test('preserva link http e tags de formatação', () => {
        const out = sanitizeHtmlServer('<a href="https://exemplo.jus.br/doc" target="_blank">doc</a> <u>x</u> <strong>y</strong>');
        expect(out).toContain('href="https://exemplo.jus.br/doc"');
        expect(out).toContain('<u>x</u>');
        expect(out).toContain('<strong>y</strong>');
    });

    test('string vazia retorna vazia', () => {
        expect(sanitizeHtmlServer('')).toBe('');
    });
});

describe('sanitizeHtml (client)', () => {
    test('em ambiente sem window (SSR/testes) retorna o HTML como está', () => {
        // Comportamento documentado: os pontos de consumo só têm conteúdo dinâmico
        // após hidratação; código server deve usar sanitizeHtmlServer
        const html = '<p>ok</p>';
        expect(sanitizeHtml(html)).toBe(html);
        expect(sanitizeHtml('')).toBe('');
    });
});

describe('escapeHtml', () => {
    test('escapa caracteres perigosos', () => {
        expect(escapeHtml('a<b>&"\'')).toBe('a&lt;b&gt;&amp;&quot;&#39;');
    });

    test('não altera texto comum', () => {
        expect(escapeHtml('evento 1, INIC1')).toBe('evento 1, INIC1');
        expect(escapeHtml('')).toBe('');
    });
});
