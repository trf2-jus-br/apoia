import { T } from '@/lib/proc/combinacoes';
import { match, Documento, EXACT, OR, ANY, SOME } from '@/lib/proc/pattern'

describe('DocumentPatternMatcher', () => {
    // Helper para criar documentos rapidamente
    const criarDocumentos = (tipos: T[]): Documento[] =>
        tipos.map((tipo, index) => ({
            id: `doc-${index + 1}`,
            tipo,
            numeroDoEvento: `${index + 1}`,
            descricaoDoEvento: ''
        }));

    describe('Operador EXACT', () => {
        it('deve corresponder a um documento exato', () => {
            const documentos = criarDocumentos([
                T.PETICAO_INICIAL
            ]);

            const padrao = [EXACT(T.PETICAO_INICIAL)];
            const resultado = match(documentos, padrao);

            expect(resultado).toEqual([{ operator: padrao[0], captured: [documentos[0]] }]);
        });

        it('deve falhar se o documento não corresponder exatamente', () => {
            const documentos = criarDocumentos([
                T.DESPACHO_DECISAO
            ]);

            const padrao = [EXACT(T.PETICAO_INICIAL)];
            const resultado = match(documentos, padrao);

            expect(resultado).toBeNull();
        });
    });

    describe('Operador OR', () => {
        it('deve corresponder a qualquer um dos tipos especificados', () => {
            const documentos = criarDocumentos([
                T.DESPACHO_DECISAO
            ]);

            const padrao = [OR(T.DESPACHO_DECISAO, T.SENTENCA)];
            const resultado = match(documentos, padrao);

            expect(resultado).toEqual([{ operator: padrao[0], captured: [documentos[0]] }]);
        });

        it('deve falhar se nenhum tipo corresponder', () => {
            const documentos = criarDocumentos([
                T.PETICAO_INICIAL
            ]);

            const padrao = [OR(T.DESPACHO_DECISAO, T.SENTENCA)];
            const resultado = match(documentos, padrao);

            expect(resultado).toBeNull();
        });
    });

    describe('Operador ANY', () => {
        it('não deve capturar nenhum documento por padrão', () => {
            const documentos = criarDocumentos([
                T.TEXTO,
                T.CONTESTACAO
            ]);

            const padrao = [ANY()];
            const resultado = match(documentos, padrao);

            expect(resultado).toEqual([{ operator: padrao[0], captured: [] }]);
        });

        it('deve capturar apenas documentos específicos', () => {
            const documentos = criarDocumentos([
                T.PETICAO_INICIAL,
                T.TEXTO,
                T.DESPACHO_DECISAO,
                T.CONTESTACAO
            ]);

            const padrao = [
                EXACT(T.PETICAO_INICIAL),
                ANY({ capture: [T.TEXTO, T.CONTESTACAO] }),
            ];
            const resultado = match(documentos, padrao);

            expect(resultado).toEqual([
                { operator: padrao[0], captured: [documentos[0]] },
                { operator: padrao[1], captured: [documentos[1], documentos[3]] }
            ]);
        });

        it('deve excluir tipos específicos', () => {
            const documentos = criarDocumentos([
                T.PETICAO_INICIAL,
                T.DESPACHO_DECISAO,
                T.CONTESTACAO
            ]);

            const padrao = [
                EXACT(T.PETICAO_INICIAL),
                ANY({ capture: [T.CONTESTACAO], except: [T.DESPACHO_DECISAO] }),
            ];
            const resultado = match(documentos, padrao);
            expect(resultado).toBeNull()
        });
    });

    it('deve retornar zero documentos se necessário', () => {
        const documentos = criarDocumentos([
            T.PETICAO_INICIAL,
            T.CONTESTACAO,
        ]);

        const padrao = [
            EXACT(T.PETICAO_INICIAL),
            ANY(),
            EXACT(T.CONTESTACAO),
        ];
        const resultado = match(documentos, padrao);

        expect(resultado).toEqual([
            { operator: padrao[0], captured: [documentos[0]] },
            { operator: padrao[1], captured: [] },
            { operator: padrao[2], captured: [documentos[1]] }
        ]);
    });

    it('deve retornar zero documentos se necessário e sendo o primeiro padrão', () => {
        const documentos = criarDocumentos([
            T.PETICAO_INICIAL
        ]);

        const padrao = [
            ANY(),
            EXACT(T.PETICAO_INICIAL),
        ];
        const resultado = match(documentos, padrao);

        expect(resultado).toEqual([
            { operator: padrao[0], captured: [] },
            { operator: padrao[1], captured: [documentos[0]] },
        ]);
    });

    it('deve representar todos os documentos entre operadores EXACT ou OR', () => {
        const documentos = criarDocumentos([
            T.PETICAO_INICIAL,
            T.DESPACHO_DECISAO,
            T.CONTESTACAO,
            T.SENTENCA
        ]);

        const padrao = [
            EXACT(T.PETICAO_INICIAL),
            ANY({ capture: [T.CONTESTACAO], except: [T.DESPACHO_DECISAO] }),
            EXACT(T.SENTENCA),
        ];
        const resultado = match(documentos, padrao);

        expect(resultado).toBeNull();
    });


    it('deve representar todos os documentos entre operadores EXACT ou OR e o fim da lista', () => {
        const documentos = criarDocumentos([
            T.PETICAO_INICIAL,
            T.DESPACHO_DECISAO,
            T.CONTESTACAO,
            T.SENTENCA
        ]);

        const padrao = [
            EXACT(T.PETICAO_INICIAL),
            ANY({ capture: [T.CONTESTACAO], except: [T.DESPACHO_DECISAO] }),
        ];
        const resultado = match(documentos, padrao);

        expect(resultado).toBeNull();
    });


    describe('Operador SOME', () => {
        it('deve exigir pelo menos um documento', () => {
            const documentos = criarDocumentos([
                T.PETICAO_INICIAL,
                T.CONTESTACAO
            ]);

            const padrao = [
                EXACT(T.PETICAO_INICIAL),
                SOME({ capture: [T.CONTESTACAO] })
            ];
            const resultado = match(documentos, padrao);

            expect(resultado).toEqual([
                { operator: padrao[0], captured: [documentos[0]] },
                { operator: padrao[1], captured: [documentos[1]] }
            ]);
        });

        it('deve capturar todos os documentos que puder', () => {
            const documentos = criarDocumentos([
                T.PETICAO_INICIAL,
                T.CONTESTACAO,
                T.CONTESTACAO,
                T.DESPACHO_DECISAO
            ]);

            const padrao = [
                EXACT(T.PETICAO_INICIAL),
                SOME({ capture: [T.CONTESTACAO] })
            ];
            const resultado = match(documentos, padrao);

            expect(resultado).toEqual([
                { operator: padrao[0], captured: [documentos[0]] },
                { operator: padrao[1], captured: [documentos[1], documentos[2]] }
            ]);
        });

        it('deve falhar se nenhum documento for capturado', () => {
            const documentos = criarDocumentos([
                T.PETICAO_INICIAL,
                T.DESPACHO_DECISAO
            ]);

            const padrao = [
                EXACT(T.PETICAO_INICIAL),
                SOME({ capture: [T.CONTESTACAO] })
            ];
            const resultado = match(documentos, padrao);

            expect(resultado).toBeNull();
        });
    });

    describe('Casos Complexos', () => {
        it('deve capturar o último documento de cada tipo', () => {
            const documentos = criarDocumentos([
                T.PETICAO_INICIAL,
                T.DESPACHO_DECISAO,
                T.EMBARGOS_DE_DECLARACAO,
                T.DESPACHO_DECISAO,
                T.EMBARGOS_DE_DECLARACAO
            ]);

            const padrao = [
                ANY(),
                EXACT(T.DESPACHO_DECISAO),
                EXACT(T.EMBARGOS_DE_DECLARACAO)
            ];
            const resultado = match(documentos, padrao);

            expect(resultado).toEqual([
                { operator: padrao[0], captured: [] },
                { operator: padrao[1], captured: [documentos[3]] },
                { operator: padrao[2], captured: [documentos[4]] }
            ]);
        });

        it('deve corresponder a um padrão complexo', () => {
            const documentos = criarDocumentos([
                T.PETICAO_INICIAL,
                T.TEXTO,
                T.CONTESTACAO,
                T.DESPACHO_DECISAO,
                T.TEXTO
            ]);

            const padrao = [
                EXACT(T.PETICAO_INICIAL),
                ANY({ capture: [T.CONTESTACAO], except: [T.DESPACHO_DECISAO] }),
                SOME({ capture: [T.CONTESTACAO, T.TEXTO] })
            ];
            const resultado = match(documentos, padrao);

            expect(resultado).toEqual([
                { operator: padrao[0], captured: [documentos[0]] },
                { operator: padrao[1], captured: [documentos[2]] },
                { operator: padrao[2], captured: [documentos[4]] }
            ]);
        });
    });

    describe('Casos de Falha', () => {
        it('deve falhar se não houver documentos suficientes', () => {
            const documentos = criarDocumentos([
                T.PETICAO_INICIAL
            ]);

            const padrao = [
                EXACT(T.PETICAO_INICIAL),
                EXACT(T.DESPACHO_DECISAO)
            ];
            const resultado = match(documentos, padrao);

            expect(resultado).toBeNull();
        });

        it('deve falhar se sobram documentos não processados', () => {
            const documentos = criarDocumentos([
                T.PETICAO_INICIAL,
                T.DESPACHO_DECISAO,
                T.CONTESTACAO
            ]);

            const padrao = [
                EXACT(T.PETICAO_INICIAL),
                EXACT(T.DESPACHO_DECISAO)
            ];
            const resultado = match(documentos, padrao);

            expect(resultado).toBeNull();
        });
    });
    describe('MatchOperator Types', () => {
        describe('EXACT Operator', () => {
            it('should create valid EXACT operator', () => {
                const operator = EXACT(T.PETICAO_INICIAL);
                expect(operator).toEqual({
                    type: 'EXACT',
                    docType: T.PETICAO_INICIAL
                });
            });
        });

        describe('OR Operator', () => {
            it('should create valid OR operator with multiple types', () => {
                const operator = OR(
                    T.PETICAO_INICIAL,
                    T.DESPACHO_DECISAO
                );
                expect(operator).toEqual({
                    type: 'OR',
                    docTypes: [T.PETICAO_INICIAL, T.DESPACHO_DECISAO]
                });
            });

            it('should create valid OR operator with single type', () => {
                const operator = OR(T.PETICAO_INICIAL);
                expect(operator).toEqual({
                    type: 'OR',
                    docTypes: [T.PETICAO_INICIAL]
                });
            });
        });

        describe('ANY Operator', () => {
            it('should create ANY operator without options', () => {
                const operator = ANY();
                expect(operator).toEqual({
                    type: 'ANY',
                    options: undefined
                });
            });

            it('should create ANY operator with capture options', () => {
                const operator = ANY({
                    capture: [T.PETICAO_INICIAL]
                });
                expect(operator).toEqual({
                    type: 'ANY',
                    options: {
                        capture: [T.PETICAO_INICIAL]
                    }
                });
            });

            it('should create ANY operator with except options', () => {
                const operator = ANY({
                    except: [T.DESPACHO_DECISAO]
                });
                expect(operator).toEqual({
                    type: 'ANY',
                    options: {
                        except: [T.DESPACHO_DECISAO]
                    }
                });
            });
        });

        describe('SOME Operator', () => {
            it('should create SOME operator without options', () => {
                const operator = SOME();
                expect(operator).toEqual({
                    type: 'SOME',
                    options: undefined
                });
            });

            it('should create SOME operator with capture options', () => {
                const operator = SOME({
                    capture: [T.CONTESTACAO]
                });
                expect(operator).toEqual({
                    type: 'SOME',
                    options: {
                        capture: [T.CONTESTACAO]
                    }
                });
            });

            it('should create SOME operator with except options', () => {
                const operator = SOME({
                    except: [T.DESPACHO_DECISAO]
                });
                expect(operator).toEqual({
                    type: 'SOME',
                    options: {
                        except: [T.DESPACHO_DECISAO]
                    }
                });
            });
        });

        describe('Complex Operator Combinations', () => {
            it('should create a complex pattern with multiple operators', () => {
                const pattern = [
                    EXACT(T.PETICAO_INICIAL),
                    OR(T.DESPACHO_DECISAO, T.SENTENCA),
                    ANY({ except: [T.EMBARGOS_DE_DECLARACAO] }),
                    SOME({ capture: [T.CONTESTACAO] })
                ];

                expect(pattern).toHaveLength(4);
                expect(pattern[0].type).toBe('EXACT');
                expect(pattern[1].type).toBe('OR');
                expect(pattern[2].type).toBe('ANY');
                expect(pattern[3].type).toBe('SOME');
            });
        });
        describe('Pattern Matching Behavior', () => {
            describe('ANY Operator Processing', () => {
                it("shouldn't capture if capture is not defined", () => {
                    const docs = criarDocumentos([
                        T.PETICAO_INICIAL,
                        T.CONTESTACAO,
                        T.DESPACHO_DECISAO
                    ]);

                    const pattern = [ANY()];
                    const result = match(docs, pattern);

                    expect(result).toEqual([
                        { operator: pattern[0], captured: [] },
                    ]);
                });

                it('should process documents in order', () => {
                    const docs = criarDocumentos([
                        T.PETICAO_INICIAL,
                        T.CONTESTACAO,
                        T.DESPACHO_DECISAO
                    ]);

                    const pattern = [ANY({
                        capture: [T.PETICAO_INICIAL,
                        T.CONTESTACAO,
                        T.DESPACHO_DECISAO]
                    })];
                    const result = match(docs, pattern);

                    expect(result).toEqual([
                        { operator: pattern[0], captured: docs },
                    ]);
                });

                it('should respect capture list strictly', () => {
                    const docs = criarDocumentos([
                        T.PETICAO_INICIAL,
                        T.CONTESTACAO
                    ]);

                    const pattern = [ANY({ capture: [T.CONTESTACAO] })];
                    const result = match(docs, pattern);

                    expect(result).toEqual([
                        { operator: pattern[0], captured: [docs[1]] },
                    ]);
                });

                it('should handle min/max constraints correctly', () => {
                    const docs = criarDocumentos([
                        T.CONTESTACAO,
                        T.CONTESTACAO,
                        T.DESPACHO_DECISAO
                    ]);

                    const pattern = [ANY({ capture: [T.CONTESTACAO] })];
                    const result = match(docs, pattern);

                    expect(result).toEqual([
                        { operator: pattern[0], captured: [docs[0], docs[1]] },
                    ]);
                });
            });

            describe('Pattern Sequence Processing', () => {
                it('should process patterns sequentially', () => {
                    const docs = criarDocumentos([
                        T.PETICAO_INICIAL,
                        T.CONTESTACAO,
                        T.DESPACHO_DECISAO
                    ]);

                    const pattern = [
                        EXACT(T.PETICAO_INICIAL),
                        ANY({ capture: [T.CONTESTACAO] })
                    ];

                    const result = match(docs, pattern);
                    expect(result).toEqual([
                        { operator: pattern[0], captured: [docs[0]] },
                        { operator: pattern[1], captured: [docs[1]] },
                    ]);
                });

                it('should stop at first non-matching document', () => {
                    const docs = criarDocumentos([
                        T.PETICAO_INICIAL,
                        T.DESPACHO_DECISAO,
                        T.CONTESTACAO
                    ]);

                    const pattern = [
                        EXACT(T.PETICAO_INICIAL),
                        ANY({ capture: [T.CONTESTACAO] })
                    ];

                    const result = match(docs, pattern);
                    expect(result).toEqual([
                        { operator: pattern[0], captured: [docs[0]] },
                        { operator: pattern[1], captured: [docs[2]] },
                    ]);
                });
            });

            describe('Edge Cases', () => {
                it('should handle empty document list', () => {
                    const docs: Documento[] = [];
                    const pattern = [ANY()];

                    const result = match(docs, pattern);
                    expect(result).toEqual([
                        { operator: pattern[0], captured: [] },
                    ]);
                });

                it('should handle empty pattern', () => {
                    const docs = criarDocumentos([T.PETICAO_INICIAL]);
                    const pattern = [];

                    const result = match(docs, pattern);
                    expect(result).toBeNull()
                });

                it('should handle complex except/capture combination', () => {
                    const docs = criarDocumentos([
                        T.PETICAO_INICIAL,
                        T.DESPACHO_DECISAO,
                        T.CONTESTACAO
                    ]);

                    const pattern = [
                        ANY({
                            capture: [T.PETICAO_INICIAL, T.CONTESTACAO],
                            except: [T.DESPACHO_DECISAO]
                        })
                    ];

                    const result = match(docs, pattern);
                    expect(result).toBeNull()
                });
            });

            describe('Real Situations', () => {
                it('shoud include contrarrazões', () => {
                    const docs = criarDocumentos([
                        T.SENTENCA,
                        T.APELACAO,
                        T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO,
                        T.APELACAO,
                        T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO,
                        T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO
                    ]);

                    const pattern =
                        [ANY(), EXACT(T.SENTENCA), ANY(), EXACT(T.APELACAO), ANY({ capture: [T.CONTRARRAZOES, T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO] }), OR(T.CONTRARRAZOES, T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO), ANY()]

                    const result = match(docs, pattern);
                    expect(result).toEqual([
                        { operator: pattern[0], captured: [] },
                        { operator: pattern[1], captured: [docs[0]] },
                        { operator: pattern[2], captured: [] },
                        { operator: pattern[3], captured: [docs[3]] },
                        { operator: pattern[4], captured: [docs[4]] },
                        { operator: pattern[5], captured: [docs[5]] },
                        { operator: pattern[6], captured: [] },
                    ]);
                });

                it('shoud include sentença', () => {
                    const docs = criarDocumentos([
                        T.PETICAO_INICIAL,
                        T.TEXTO,
                        T.TEXTO,
                        T.CONTESTACAO,
                        T.TEXTO,
                        T.TEXTO,
                        T.SENTENCA,
                        T.TEXTO,
                        T.TEXTO,
                    ]);

                    const pattern =
                    [ANY(), EXACT(T.PETICAO_INICIAL), ANY({ capture: [T.CONTESTACAO, T.INFORMACAO_EM_MANDADO_DE_SEGURANCA] }), OR(T.CONTESTACAO, T.INFORMACAO_EM_MANDADO_DE_SEGURANCA), ANY(), EXACT(T.SENTENCA), ANY()]

                    const result = match(docs, pattern);
                    expect(result).toEqual([
                        { operator: pattern[0], captured: [] },
                        { operator: pattern[1], captured: [docs[0]] },
                        { operator: pattern[2], captured: [] },
                        { operator: pattern[3], captured: [docs[3]] },
                        { operator: pattern[4], captured: [] },
                        { operator: pattern[5], captured: [docs[6]] },
                        { operator: pattern[6], captured: [] },
                    ]);
                });


            });
        });
    });
});