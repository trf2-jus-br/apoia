import { T } from '@/lib/proc/combinacoes';
import { match, matchFull, Documento, EXACT, OR, PHASE, ALT, ANY } from '@/lib/proc/pattern'

/**
 * Testes do operador ALT (alternativa posicional).
 *
 * SEMÂNTICA DO MOTOR (importante para entender os testes):
 * O motor varre de trás para frente, e cada call site decrementa 1 em
 * patternIdx e itemIdx. O sucesso é patternIdx < 0 && itemIdx < 0.
 *
 * O ALT funciona corretamente quando:
 * 1. É o ÚNICO operador do pattern (caller = matchFull, que não decrementou).
 * 2. A alternativa tem 1 operador (consome 1 item).
 *
 * LIMITAÇÕES CONHECIDAS (a serem endereçadas em iteração futura):
 * - ALT no MEIO do pattern com alternativa não-vazia: a alternativa precisa
 *   consumir "1 item a mais" do que o caller decrementou, o que o motor atual
 *   não suporta diretamente.
 */
describe('Operador ALT (alternativa posicional)', () => {
    const criarDocumentos = (tipos: T[]): Documento[] =>
        tipos.map((tipo, index) => ({
            id: `doc-${index + 1}`,
            tipo,
            numeroDoEvento: `${index + 1}`,
            descricaoDoEvento: ''
        }));

    describe('Comportamento básico', () => {
        it('deve usar a primeira alternativa quando ela casa', () => {
            const docs = criarDocumentos([T.PETICAO_INICIAL]);
            const pattern = [
                ALT(
                    [EXACT(T.PETICAO_INICIAL)],
                    [EXACT(T.SENTENCA)]
                )
            ];
            const r = matchFull(docs, pattern);
            expect(r).not.toBeNull();
            expect(r!.items[0].captured[0].tipo).toBe(T.PETICAO_INICIAL);
        });

        it('deve tentar a segunda alternativa quando a primeira falha', () => {
            const docs = criarDocumentos([T.SENTENCA]);
            const pattern = [
                ALT(
                    [EXACT(T.PETICAO_INICIAL)], // falha
                    [EXACT(T.SENTENCA)] // casa
                )
            ];
            const r = matchFull(docs, pattern);
            expect(r).not.toBeNull();
            expect(r!.items[0].captured[0].tipo).toBe(T.SENTENCA);
        });

        it('deve retornar null quando todas as alternativas falham', () => {
            const docs = criarDocumentos([T.CONTESTACAO]);
            const pattern = [
                ALT(
                    [EXACT(T.PETICAO_INICIAL)],
                    [EXACT(T.SENTENCA)]
                )
            ];
            const r = matchFull(docs, pattern);
            expect(r).toBeNull();
        });

        it('deve retornar null quando ALT não tem alternativas', () => {
            const docs = criarDocumentos([T.PETICAO_INICIAL]);
            const pattern = [ALT()];
            const r = matchFull(docs, pattern);
            expect(r).toBeNull();
        });
    });

    describe('PHASE dentro de alternativa', () => {
        it('deve preservar PHASE da alternativa vencedora', () => {
            const docs = criarDocumentos([T.PETICAO_INICIAL, T.APELACAO]);
            const pattern = [
                ALT(
                    [EXACT(T.PETICAO_INICIAL), PHASE('FASE_ALT'), EXACT(T.APELACAO)],
                    [EXACT(T.PETICAO_INICIAL), EXACT(T.CONTESTACAO)]
                )
            ];
            const r = matchFull(docs, pattern);
            expect(r).not.toBeNull();
            expect(r!.phasesMatched.map(p => p.phase)).toContain('FASE_ALT');
        });

        it('NÃO deve incluir PHASE de alternativa que falhou', () => {
            const docs = criarDocumentos([T.PETICAO_INICIAL, T.CONTESTACAO]);
            const pattern = [
                ALT(
                    [EXACT(T.PETICAO_INICIAL), PHASE('FASE_FALHA'), EXACT(T.APELACAO)], // falha
                    [EXACT(T.PETICAO_INICIAL), EXACT(T.CONTESTACAO)] // vence
                )
            ];
            const r = matchFull(docs, pattern);
            expect(r).not.toBeNull();
            expect(r!.phasesMatched.map(p => p.phase)).not.toContain('FASE_FALHA');
        });
    });

    describe('Composição com OR', () => {
        it('deve funcionar com OR dentro da alternativa', () => {
            const docs = criarDocumentos([T.DESPACHO_DECISAO]);
            const pattern = [
                ALT(
                    [OR(T.SENTENCA, T.DESPACHO_DECISAO)],
                    [OR(T.PETICAO_INICIAL)]
                )
            ];
            const r = matchFull(docs, pattern);
            expect(r).not.toBeNull();
            const altResult = r!.items.find(i => i.operator.type === 'OR');
            expect(altResult!.captured[0].tipo).toBe(T.DESPACHO_DECISAO);
        });
    });

    describe('Compatibilidade com API legacy match()', () => {
        it('match() deve retornar o array de MatchResultItem incluindo o ALT', () => {
            const docs = criarDocumentos([T.PETICAO_INICIAL]);
            const pattern = [
                ALT(
                    [EXACT(T.PETICAO_INICIAL)],
                    [EXACT(T.SENTENCA)]
                )
            ];
            const r = match(docs, pattern);
            expect(r).not.toBeNull();
            expect(r!.length).toBe(1);
            expect(r![0].operator.type).toBe('EXACT');
            expect(r![0].captured[0].tipo).toBe(T.PETICAO_INICIAL);
        });
    });

    describe('Casos práticos do domínio', () => {
        it('deve modelar "início por SENTENCA ou ACORDAO" com ALT (1 op por alternativa)', () => {
            const docs = criarDocumentos([T.ACORDAO]);
            const pattern = [
                ALT(
                    [EXACT(T.SENTENCA)],
                    [EXACT(T.ACORDAO)]
                )
            ];
            const r = matchFull(docs, pattern);
            expect(r).not.toBeNull();
            const altResult = r!.items.find(i => i.operator.type === 'EXACT');
            expect(altResult!.captured[0].tipo).toBe(T.ACORDAO);
        });
    });

    describe('Casos com ALT no meio do pattern', () => {
        it('deve localizar, preferencialmente, uma peça a mais', () => {
            const docs = criarDocumentos([T.PETICAO_INICIAL, T.DESPACHO_DECISAO, T.CONTESTACAO, T.CERTIDAO, T.REPLICA, T.SENTENCA]);
            const pattern = [
                EXACT(T.PETICAO_INICIAL),
                ALT(
                    [EXACT(T.DESPACHO_DECISAO), ANY(), EXACT(T.REPLICA), ANY()],
                    [EXACT(T.DESPACHO_DECISAO), ANY()],
                ),
                EXACT(T.SENTENCA)
            ];
            const r = matchFull(docs, pattern);
            expect(r).not.toBeNull();
            const altResults = r!.items.filter(i => i.operator.type === 'EXACT');
            expect(altResults[0].captured[0].tipo).toBe(T.PETICAO_INICIAL);
            expect(altResults[1].captured[0].tipo).toBe(T.DESPACHO_DECISAO);
            expect(altResults[2].captured[0].tipo).toBe(T.REPLICA);
            expect(altResults[3].captured[0].tipo).toBe(T.SENTENCA);
        });

        it('deve localizar, preferencialmente, uma peça a mais, se não conseguir, deve localizar a alternativa menor', () => {
            const docs = criarDocumentos([T.PETICAO_INICIAL, T.DESPACHO_DECISAO, T.CONTESTACAO, T.CERTIDAO, T.SENTENCA]);
            const pattern = [
                EXACT(T.PETICAO_INICIAL),
                ALT(
                    [EXACT(T.DESPACHO_DECISAO), ANY(), EXACT(T.REPLICA), ANY()],
                    [EXACT(T.DESPACHO_DECISAO), ANY()],
                ),
                EXACT(T.SENTENCA)
            ];
            const r = matchFull(docs, pattern);
            expect(r).not.toBeNull();
            const altResults = r!.items.filter(i => i.operator.type === 'EXACT');
            expect(altResults[0].captured[0].tipo).toBe(T.PETICAO_INICIAL);
            expect(altResults[1].captured[0].tipo).toBe(T.DESPACHO_DECISAO);
            expect(altResults[2].captured[0].tipo).toBe(T.SENTENCA);
        });

        it('alternativa vazia', () => {
            const docs = criarDocumentos([T.PETICAO_INICIAL, T.SENTENCA]);
            const pattern = [
                EXACT(T.PETICAO_INICIAL),
                ALT(
                    [EXACT(T.DESPACHO_DECISAO), ANY(), EXACT(T.REPLICA), ANY()],
                    [EXACT(T.DESPACHO_DECISAO), ANY()],
                    [],
                ),
                EXACT(T.SENTENCA)
            ];
            const r = matchFull(docs, pattern);
            expect(r).not.toBeNull();
            const altResults = r!.items.filter(i => i.operator.type === 'EXACT');
            expect(altResults[0].captured[0].tipo).toBe(T.PETICAO_INICIAL);
            expect(altResults[1].captured[0].tipo).toBe(T.SENTENCA);
        });

        it('alternativa vazia na primeira posição debug', () => {
            const docs = criarDocumentos([T.PETICAO_INICIAL, T.DESPACHO_DECISAO, T.SENTENCA]);
            const pattern = [
                ALT(
                    [],
                    [ANY({ capture: [T.PETICAO_INICIAL] }), EXACT(T.DESPACHO_DECISAO)],
                ),
                ANY(),
                EXACT(T.SENTENCA)
            ];
            const r = matchFull(docs, pattern);
            console.log(JSON.stringify(r, null, 2));

            expect(r).not.toBeNull();
            const altResults = r!.items.filter(i => i.operator.type === 'EXACT');
            expect(altResults[0].captured[0].tipo).toBe(T.SENTENCA);
        });
    });



});
