import { preprocessTemplate } from '@/lib/ai/template'

describe('Template Preprocessing', () => {

    describe('Snippet', () => {
        it('deve substituir {} por snippet', () => {
            const template = 'texto antes {expression} texto depois';
            const resultado = preprocessTemplate(template);
            expect(resultado).toBe('texto antes <snippet id="0" expr="expression"></snippet> texto depois');
        });

        it('deve substituir múltiplos {} por snippets', () => {
            const template = 'texto antes {expression1} e {expression2} texto depois';
            const resultado = preprocessTemplate(template);
            expect(resultado).toBe('texto antes <snippet id="0" expr="expression1"></snippet> e <snippet id="1" expr="expression2"></snippet> texto depois');
        });

        it('deve acrescentar sufixo "x" em snippets no início da primeira linha', () => {
            const template = '{expression} texto depois';
            const resultado = preprocessTemplate(template);
            expect(resultado).toBe('<snippet id="0x" expr="expression"></snippet> texto depois');
        });
        it('deve acrescentar sufixo "x" em snippets no início de linha', () => {
            const template = 'texto antes\n{expression} texto depois';
            const resultado = preprocessTemplate(template);
            expect(resultado).toBe('texto antes\n<snippet id="0x" expr="expression"></snippet> texto depois');
        });
    });

    describe('If Statements', () => {
        it('deve substituir {{expression}} por if', () => {
            const template = 'texto antes {{expression}} texto depois';
            const resultado = preprocessTemplate(template);
            expect(resultado).toBe('texto antes <if id="0" expr="expression"> texto depois</if>');
        });

        it('deve substituir múltiplos {{expression}} por ifs', () => {
            const template = 'texto antes {{expression1}}primeira expressão{{}} e {{expression2}}segunda expressão{{}} texto depois';
            const resultado = preprocessTemplate(template);
            expect(resultado).toBe('texto antes <if id="0" expr="expression1">primeira expressão</if> e <if id="1" expr="expression2">segunda expressão</if> texto depois');
        });

        it('deve fechar ifs automaticamente', () => {
            const template = 'texto antes {{expression1}} e {{expression2}} texto depois';
            const resultado = preprocessTemplate(template);
            expect(resultado).toBe('texto antes <if id="0" expr="expression1"> e </if><if id="1" expr="expression2"> texto depois</if>');
        });
    })

    describe('Outer If Statements', () => {
        it('deve substituir {{{expression}}} por if', () => {
            const template = 'texto antes {{{expression}}} texto depois';
            const resultado = preprocessTemplate(template);
            expect(resultado).toBe('texto antes <if id="0" expr="expression"> texto depois</if>');
        });
        it('deve substituir {{{}}} por /if', () => {
            const template = 'texto antes {{{expression}}}conteúdo{{{}}} texto depois';
            const resultado = preprocessTemplate(template);
            expect(resultado).toBe('texto antes <if id="0" expr="expression">conteúdo</if> texto depois');
        });
    })

    describe('Outer If and If Statements Combined', () => {
        it('deve substituir {{{expression}}} e {{expression}} por ifs', () => {
            const template = 'texto antes {{{expression1}}} e {{expression2}} texto depois';
            const resultado = preprocessTemplate(template);
            expect(resultado).toBe('texto antes <if id="0" expr="expression1"> e <if id="1" expr="expression2"> texto depois</if></if>');
        });

        it('deve fechar ifs e outer-ifs corretamente', () => {
            const template = 'texto antes {{{expression1}}}{{expression2}}conteúdo{{{}}} texto depois';
            const resultado = preprocessTemplate(template);
            expect(resultado).toBe('texto antes <if id="0" expr="expression1"><if id="1" expr="expression2">conteúdo</if></if> texto depois');
        });
    })

    describe('Multiline Templates', () => {
        it('deve lidar com templates multiline', () => {
            const template = `Primeira linha {expression1}.
{{segunda linha opcional}}
Segunda linha
{{}}
Terceira linha`;
            const resultado = preprocessTemplate(template);
            expect(resultado).toBe(`Primeira linha <snippet id="0" expr="expression1"></snippet>.
<if id="1" expr="segunda linha opcional">
Segunda linha
</if>
Terceira linha`);
        });
    })
});

