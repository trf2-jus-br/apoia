import { describe, expect, test } from '@jest/globals';
import { addLinkToPieces } from '../lib/ui/link-to-piece';
import { TextoType } from '../lib/ai/prompt-types';
import { DadosDoProcessoType } from '../lib/proc/process-types';

describe('addLinkToPieces', () => {
    // Mock base para dadosDoProcesso
    const createMockDadosDoProcesso = (pecas: any[]): DadosDoProcessoType => ({
        pecas,
        poloAtivo: 'Autor Teste',
        poloPassivo: 'Réu Teste',
    });

    // Mock base para textos
    const createMockTexto = (
        id: string,
        numeroDoProcesso: string,
        event: string,
        label: string
    ): TextoType => ({
        id,
        numeroDoProcesso,
        event,
        label,
        descr: `Descrição ${label}`,
        slug: label.toLowerCase(),
        sigilo: 'N',
    });

    test('deve adicionar link para evento 1, INIC1', () => {
        const html = 'Conforme evento 1, INIC1 do processo.';
        const numeroDoProcesso = '50123935320214025104';

        const textos: TextoType[] = [
            createMockTexto(
                'JFRJ_511631026724981731315583503898',
                numeroDoProcesso,
                '1',
                'INIC1'
            ),
        ];

        const dadosDoProcesso = createMockDadosDoProcesso([
            {
                id: 'JFRJ_511631026724981731315583503898',
                numeroDoProcesso,
                numeroDoEvento: '1',
                descricaoDoEvento: 'Petição Inicial',
                descr: 'Petição Inicial',
                tipoDoConteudo: 'application/pdf',
                sigilo: 'N',
                pConteudo: undefined,
                conteudo: undefined,
                pDocumento: undefined,
                documento: undefined,
                categoria: undefined,
                rotulo: 'INIC1',
                dataHora: new Date('2021-01-01'),
            },
        ]);

        const result = addLinkToPieces(html, textos, dadosDoProcesso);

        expect(result).toContain('widgetlinkdocumento');
        expect(result).toContain('data-idpiece="JFRJ_511631026724981731315583503898"');
        expect(result).toContain('data-iddocumento="511631026724981731315583503898"');
        expect(result).toContain('data-numprocesso="50123935320214025104"');
        expect(result).toContain('data-mimetype="pdf"');
        expect(result).toContain('data-uf="RJ"');
        expect(result).toContain('data-is2g="false"');
        expect(result).toContain('>INIC1</span>');
        expect(result).toContain('evento 1, ');
    });

    test('deve adicionar links para evento 1, INIC1, PROC1 e CERT1', () => {
        const html = 'Conforme evento 1, INIC1, PROC1 e CERT1 anexos.';
        const numeroDoProcesso = '50123935320214025104';

        const textos: TextoType[] = [
            createMockTexto(
                'JFRJ_511631026724981731315583503898',
                numeroDoProcesso,
                '1',
                'INIC1'
            ),
            createMockTexto(
                'JFRJ_511631026724981731315583503899',
                numeroDoProcesso,
                '1',
                'PROC1'
            ),
            createMockTexto(
                'JFRJ_511631026724981731315583503900',
                numeroDoProcesso,
                '1',
                'CERT1'
            ),
        ];

        const dadosDoProcesso = createMockDadosDoProcesso([
            {
                id: 'JFRJ_511631026724981731315583503898',
                numeroDoProcesso,
                numeroDoEvento: '1',
                descricaoDoEvento: 'Petição Inicial',
                descr: 'Petição Inicial',
                tipoDoConteudo: 'application/pdf',
                sigilo: 'N',
                pConteudo: undefined,
                conteudo: undefined,
                pDocumento: undefined,
                documento: undefined,
                categoria: undefined,
                rotulo: 'INIC1',
                dataHora: new Date('2021-01-01'),
            },
            {
                id: 'JFRJ_511631026724981731315583503899',
                numeroDoProcesso,
                numeroDoEvento: '1',
                descricaoDoEvento: 'Procuração',
                descr: 'Procuração',
                tipoDoConteudo: 'application/pdf',
                sigilo: 'N',
                pConteudo: undefined,
                conteudo: undefined,
                pDocumento: undefined,
                documento: undefined,
                categoria: undefined,
                rotulo: 'PROC1',
                dataHora: new Date('2021-01-01'),
            },
            {
                id: 'JFRJ_511631026724981731315583503900',
                numeroDoProcesso,
                numeroDoEvento: '1',
                descricaoDoEvento: 'Certidão',
                descr: 'Certidão',
                tipoDoConteudo: 'application/pdf',
                sigilo: 'N',
                pConteudo: undefined,
                conteudo: undefined,
                pDocumento: undefined,
                documento: undefined,
                categoria: undefined,
                rotulo: 'CERT1',
                dataHora: new Date('2021-01-01'),
            },
        ]);

        const result = addLinkToPieces(html, textos, dadosDoProcesso);

        // Verifica se todos os três links foram criados
        expect(result).toContain('data-idpiece="JFRJ_511631026724981731315583503898"');
        expect(result).toContain('data-idpiece="JFRJ_511631026724981731315583503899"');
        expect(result).toContain('data-idpiece="JFRJ_511631026724981731315583503900"');
        expect(result).toContain('>INIC1</span>');
        expect(result).toContain('>PROC1</span>');
        expect(result).toContain('>CERT1</span>');
        expect(result).toMatch(/evento 1,.*INIC1.*PROC1.*CERT1/);
    });

    test('deve adicionar link para Evento 1, INIC1 (com E maiúsculo)', () => {
        const html = 'Conforme Evento 1, INIC1 do processo.';
        const numeroDoProcesso = '50123935320214025104';

        const textos: TextoType[] = [
            createMockTexto(
                'JFRJ_511631026724981731315583503898',
                numeroDoProcesso,
                '1',
                'INIC1'
            ),
        ];

        const dadosDoProcesso = createMockDadosDoProcesso([
            {
                id: 'JFRJ_511631026724981731315583503898',
                numeroDoProcesso,
                numeroDoEvento: '1',
                descricaoDoEvento: 'Petição Inicial',
                descr: 'Petição Inicial',
                tipoDoConteudo: 'application/pdf',
                sigilo: 'N',
                pConteudo: undefined,
                conteudo: undefined,
                pDocumento: undefined,
                documento: undefined,
                categoria: undefined,
                rotulo: 'INIC1',
                dataHora: new Date('2021-01-01'),
            },
        ]);

        const result = addLinkToPieces(html, textos, dadosDoProcesso);

        expect(result).toContain('widgetlinkdocumento');
        expect(result).toContain('data-idpiece="JFRJ_511631026724981731315583503898"');
        expect(result).toContain('>INIC1</span>');
        expect(result).toContain('Evento 1, '); // Deve manter o E maiúsculo
    });

    test('deve adicionar link para evento 4, 2º Grau, PARECER1', () => {
        const html = 'Conforme evento 4, 2º Grau, PARECER1 anexo.';
        const numeroDoProcesso = '00012345620214046000';

        const textos: TextoType[] = [
            createMockTexto(
                'TRF2_611631026724981731315583503901',
                numeroDoProcesso,
                '4',
                'PARECER1'
            ),
        ];

        const dadosDoProcesso = createMockDadosDoProcesso([
            {
                id: 'TRF2_611631026724981731315583503901',
                numeroDoProcesso,
                numeroDoEvento: '4',
                descricaoDoEvento: 'Parecer',
                descr: 'Parecer do MP',
                tipoDoConteudo: 'application/pdf',
                sigilo: 'N',
                pConteudo: undefined,
                conteudo: undefined,
                pDocumento: undefined,
                documento: undefined,
                categoria: undefined,
                rotulo: 'PARECER1',
                dataHora: new Date('2021-01-15'),
            },
        ]);

        const result = addLinkToPieces(html, textos, dadosDoProcesso);

        expect(result).toContain('widgetlinkdocumento');
        expect(result).toContain('data-idpiece="TRF2_611631026724981731315583503901"');
        expect(result).toContain('data-iddocumento="611631026724981731315583503901"');
        expect(result).toContain('data-numprocesso="00012345620214046000"');
        expect(result).toContain('data-mimetype="pdf"');
        expect(result).toContain('data-uf=""'); // TRF não extrai UF (lógica atual do método)
        expect(result).toContain('data-is2g="true"'); // TRF é 2º grau
        expect(result).toContain('>PARECER1</span>');
        // Nota: o método não preserva "2º Grau" na saída, apenas usa para matching
        expect(result).toContain('evento 4, 2º Grau, ');
    });

    test('não deve modificar HTML quando não há correspondências', () => {
        const html = 'Este é um texto sem referências a eventos.';
        const textos: TextoType[] = [];
        const dadosDoProcesso = createMockDadosDoProcesso([]);

        const result = addLinkToPieces(html, textos, dadosDoProcesso);

        expect(result).toBe(html);
    });

    test('não deve adicionar link quando o evento não corresponde', () => {
        const html = 'Conforme evento 2, INIC1 do processo.';
        const numeroDoProcesso = '50123935320214025104';

        const textos: TextoType[] = [
            createMockTexto(
                'JFRJ_511631026724981731315583503898',
                numeroDoProcesso,
                '1', // evento 1, mas o HTML menciona evento 2
                'INIC1'
            ),
        ];

        const dadosDoProcesso = createMockDadosDoProcesso([
            {
                id: 'JFRJ_511631026724981731315583503898',
                numeroDoProcesso,
                numeroDoEvento: '1',
                descricaoDoEvento: 'Petição Inicial',
                descr: 'Petição Inicial',
                tipoDoConteudo: 'application/pdf',
                sigilo: 'N',
                pConteudo: undefined,
                conteudo: undefined,
                pDocumento: undefined,
                documento: undefined,
                categoria: undefined,
                rotulo: 'INIC1',
                dataHora: new Date('2021-01-01'),
            },
        ]);

        const result = addLinkToPieces(html, textos, dadosDoProcesso);

        // Não deve criar o link pois o evento não corresponde
        expect(result).not.toContain('widgetlinkdocumento');
        expect(result).toBe(html);
    });

    test('não deve adicionar link para labels em minúsculas no HTML (limitação do método)', () => {
        const html = 'Conforme evento 1, inic1 do processo.';
        const numeroDoProcesso = '50123935320214025104';

        const textos: TextoType[] = [
            createMockTexto(
                'JFRJ_511631026724981731315583503898',
                numeroDoProcesso,
                '1',
                'INIC1' // maiúsculo
            ),
        ];

        const dadosDoProcesso = createMockDadosDoProcesso([
            {
                id: 'JFRJ_511631026724981731315583503898',
                numeroDoProcesso,
                numeroDoEvento: '1',
                descricaoDoEvento: 'Petição Inicial',
                descr: 'Petição Inicial',
                tipoDoConteudo: 'application/pdf',
                sigilo: 'N',
                pConteudo: undefined,
                conteudo: undefined,
                pDocumento: undefined,
                documento: undefined,
                categoria: undefined,
                rotulo: 'INIC1',
                dataHora: new Date('2021-01-01'),
            },
        ]);

        const result = addLinkToPieces(html, textos, dadosDoProcesso);

        // O método atual não captura labels em minúsculas no HTML (regex procura [A-Z]+\d+)
        expect(result).not.toContain('widgetlinkdocumento');
        expect(result).toBe(html);
    });
});
