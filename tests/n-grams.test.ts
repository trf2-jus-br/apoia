import { highlightCitationsLongestMatch } from '../lib/n-grams';

describe('highlightCitationsLongestMatch', () => {

  test('deve encontrar match simples entre source e generated', () => {
    const sourceHtml = '<library-document title="Doc1">Este é um texto de exemplo longo o suficiente para ser encontrado com o tamanho padrão de n-gram que é doze tokens.</library-document>';
    const generatedHtml = 'O documento diz: Este é um texto de exemplo longo o suficiente para ser encontrado com o tamanho padrão de n-gram que é doze tokens.';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    expect(result).toContain('<span class="citacao"');
    expect(result).toContain('Este é um texto de exemplo');
  });

  test('deve lidar com tags fixas (library-document, library-attachment, page)', () => {
    const sourceHtml = `
      <library-document title="Manual">
        <library-attachment filename="doc.pdf">
          <page number="1">
            Estas são as instruções importantes e detalhadas sobre como proceder com o processo administrativo completo de acordo com as normas vigentes.
          </page>
        </library-attachment>
      </library-document>
    `;
    const generatedHtml = 'As instruções dizem: Estas são as instruções importantes e detalhadas sobre como proceder com o processo administrativo completo de acordo com as normas vigentes.';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    expect(result).toContain('<span class="citacao"');
    expect(result).toContain('title=');
    // O contexto será do LIBRARY-ATTACHMENT pois é a tag mais interna que define o documento
    expect(result).toContain('anexo de documento da biblioteca');
    expect(result).toContain('Título: Manual');
    expect(result).toContain('Arq: doc.pdf');
    expect(result).toContain('Pág: 1');
  });

  test('deve lidar com tags dinâmicas (event + label)', () => {
    const sourceHtml = `
      <acordao event="74, 2º Grau" id="123" label="ACOR1">
        <page number="1">
          Conforme a decisão judicial relevante proferida pelo tribunal de justiça em segunda instância após análise detalhada dos autos processuais.
        </page>
      </acordao>
    `;
    const generatedHtml = 'Conforme a decisão judicial relevante proferida pelo tribunal de justiça em segunda instância após análise detalhada dos autos processuais.';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    expect(result).toContain('<span class="citacao"');
    expect(result).toContain('74, 2º GRAU');
    expect(result).toContain('ACOR1');
  });

  test('deve detectar match que cruza páginas', () => {
    const sourceHtml = `
      <library-document title="Doc">
        <library-attachment filename="test.pdf">
          <page number="1">
            Esta é a primeira parte do texto longo que começa na página um e contém informações importantes sobre
          </page>
          <page number="2">
            o processo e continua aqui na segunda página com mais detalhes relevantes para a análise do caso.
          </page>
        </library-attachment>
      </library-document>
    `;
    const generatedHtml = 'Cita: Esta é a primeira parte do texto longo que começa na página um e contém informações importantes sobre o processo e continua aqui na segunda página com mais detalhes relevantes para a análise do caso.';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    // Verifica que há citação detectada
    expect(result).toContain('<span class="citacao"');
    expect(result).toContain('anexo de documento da biblioteca');

    // Verifica que os números de página estão presentes
    expect(result).toContain('Pág: 1');
    expect(result).toContain('Pág: 2');

    // Deve ter pelo menos 2 spans (um para cada página)
    const spanCount = (result.match(/<span class="citacao"/g) || []).length;
    expect(spanCount).toBeGreaterThanOrEqual(2);
  });

  test('deve lidar com múltiplas fontes diferentes', () => {
    const sourceHtml = `
      <library-document title="Doc1">
        Este é o conteúdo completo do primeiro documento com informações relevantes sobre o tema principal que estamos analisando.
      </library-document>
      <library-document title="Doc2">
        Já este outro texto pertence ao segundo documento e traz dados complementares importantes para fundamentar a decisão final.
      </library-document>
    `;
    const generatedHtml = 'Primeiro: Este é o conteúdo completo do primeiro documento com informações relevantes sobre o tema principal que estamos analisando. Depois: Já este outro texto pertence ao segundo documento e traz dados complementares importantes para fundamentar a decisão final.';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    expect(result).toContain('Doc1');
    expect(result).toContain('Doc2');
  });

  test('não deve marcar texto sem match', () => {
    const sourceHtml = '<library-document title="Doc">Este é um texto original que não tem nenhuma relação com o outro conteúdo gerado.</library-document>';
    const generatedHtml = 'Texto completamente diferente e novo sem qualquer semelhança ou correspondência com a fonte.';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    expect(result).not.toContain('<span class="citacao"');
    expect(result).toBe(generatedHtml);
  });

  test('deve preservar tags HTML no texto gerado', () => {
    const sourceHtml = '<library-document title="Doc">Este é um texto muito importante e relevante que deve ser destacado com formatação especial no documento final.</library-document>';
    const generatedHtml = 'Diz: <b>Este é um texto muito importante e relevante que deve ser destacado com formatação especial no documento final.</b>';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    expect(result).toContain('<span class="citacao"');
    expect(result).toContain('<b>');
    expect(result).toContain('</b>');
  });

  test('deve usar nGramSize customizado', () => {
    const sourceHtml = '<library-document title="Doc">Um dois três quatro cinco seis.</library-document>';
    const generatedHtml = 'Texto: Um dois três quatro cinco seis.';

    // Com nGramSize pequeno deve encontrar
    const result1 = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 3);
    expect(result1).toContain('<span class="citacao"');

    // Com nGramSize grande demais pode não encontrar
    const result2 = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 20);
    expect(result2).not.toContain('<span class="citacao"');
  });

  test('deve lidar com pontuação corretamente', () => {
    const sourceHtml = '<library-document title="Doc">Olá, mundo! Como vai? Espero que esteja tudo bem com você e sua família neste momento importante.</library-document>';
    const generatedHtml = 'Resposta: Olá, mundo! Como vai? Espero que esteja tudo bem com você e sua família neste momento importante.';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    expect(result).toContain('<span class="citacao"');
    expect(result).toContain('Olá, mundo!');
  });

  test('deve lidar com acentos e caracteres especiais', () => {
    const sourceHtml = '<library-document title="Doc">A decisão crítica está prevista no § 3º do artigo mencionado e deve ser aplicada conforme determina a legislação vigente.</library-document>';
    const generatedHtml = 'Conforme: A decisão crítica está prevista no § 3º do artigo mencionado e deve ser aplicada conforme determina a legislação vigente.';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    expect(result).toContain('<span class="citacao"');
    expect(result).toContain('decisão crítica');
  });

  test('deve escolher o match mais longo quando há múltiplas possibilidades', () => {
    const sourceHtml = `
      <library-document title="Doc1">
        Este é um texto que aparece nos dois documentos de forma idêntica.
      </library-document>
      <library-document title="Doc2">
        Este é um texto que aparece nos dois documentos de forma idêntica. Porém aqui tem muito mais informações adicionais relevantes que fazem este match ser bem maior.
      </library-document>
    `;
    const generatedHtml = 'Cita: Este é um texto que aparece nos dois documentos de forma idêntica. Porém aqui tem muito mais informações adicionais relevantes que fazem este match ser bem maior.';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    // Deve escolher Doc2 que tem o match mais longo
    expect(result).toContain('Doc2');
    expect(result).not.toContain('Doc1');
  });

  test('deve lidar com texto vazio', () => {
    const sourceHtml = '';
    const generatedHtml = '';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    expect(result).toBe('');
  });

  test('deve lidar com texto sem tags metadata', () => {
    const sourceHtml = '<p>Este é um texto simples sem metadados específicos mas ainda assim deve ser detectado corretamente pelo algoritmo.</p>';
    const generatedHtml = 'Cita: Este é um texto simples sem metadados específicos mas ainda assim deve ser detectado corretamente pelo algoritmo.';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    // Sem contexto, mas ainda deve marcar o match
    expect(result).toContain('<span class="citacao"');
  });

  test('deve formatar tooltip corretamente para diferentes contextos', () => {
    const sourceHtml = `
      <library-document title="Manual">
        <library-attachment filename="manual.pdf">
          <page number="5">
            Este é um conteúdo muito específico e detalhado que aparece na página cinco do manual oficial do sistema.
          </page>
        </library-attachment>
      </library-document>
    `;
    const generatedHtml = 'Referência: Este é um conteúdo muito específico e detalhado que aparece na página cinco do manual oficial do sistema.';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    expect(result).toContain('title=');
    expect(result).toContain('Título: Manual');
    expect(result).toContain('Arq: manual.pdf');
    expect(result).toContain('Pág: 5');
  });

  test('deve lidar com múltiplas ocorrências da mesma frase', () => {
    const sourceHtml = `
      <library-document title="Doc1">
        Esta é uma frase longa que se repete em diferentes documentos para testar a capacidade de detecção múltipla.
      </library-document>
      <library-document title="Doc2">
        Esta é uma frase longa que se repete em diferentes documentos para testar a capacidade de detecção múltipla.
      </library-document>
    `;
    const generatedHtml = 'Primeira: Esta é uma frase longa que se repete em diferentes documentos para testar a capacidade de detecção múltipla. Segunda: Esta é uma frase longa que se repete em diferentes documentos para testar a capacidade de detecção múltipla.';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    // Ambas devem ser marcadas
    const spanCount = (result.match(/<span class="citacao"/g) || []).length;
    expect(spanCount).toBeGreaterThanOrEqual(2);
  });

  test('caso completo com estrutura complexa', () => {
    const sourceHtml = `
      <library-document title="Estilo Literário">
        Atenção porque o magistrado gosta muito de utilizar termos em latim durante suas decisões judiciais.
        <library-attachment filename="exemplo-2025-11-17-15-34-20.pdf">
          <page number="1">
            Este é o texto de exemplo completo da página um do documento anexado.
          </page>
          <page number="2">
            Este é o texto de exemplo completo da página dois do documento anexado.
          </page>
        </library-attachment>
      </library-document>
      <acordao event="74, 2º Grau" id="21677701903700971389805381669" label="ACOR1">
        <page number="1">
          Conforme o texto do acórdão mencionado na primeira página do documento oficial.
        </page>
        <page number="2">
          E o acórdão continua aqui na segunda página com mais fundamentação legal.
        </page>
      </acordao>
    `;

    const generatedHtml = `
      Conforme estilo: o magistrado gosta muito de utilizar termos em latim durante suas decisões judiciais.
      O documento menciona: Este é o texto de exemplo completo da página um do documento anexado.
      E depois: Este é o texto de exemplo completo da página dois do documento anexado.
      O acórdão afirma: Conforme o texto do acórdão mencionado na primeira página do documento oficial.
      E continua: E o acórdão continua aqui na segunda página com mais fundamentação legal.
    `;

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    // Deve ter múltiplas citações
    const spanCount = (result.match(/<span class="citacao"/g) || []).length;
    expect(spanCount).toBeGreaterThan(0);

    // Deve conter informações de diferentes fontes
    expect(result).toContain('Estilo Literário');
    expect(result).toContain('ACOR1');
    expect(result).toContain('74, 2º GRAU');

    // Deve conter números de página
    expect(result).toContain('Pág:');
  });

  test('deve evitar spans vazios', () => {
    const sourceHtml = '<library-document title="Doc">Este é um texto que será citado no meio de outros conteúdos do documento final gerado.</library-document>';
    const generatedHtml = 'Antes Este é um texto que será citado no meio de outros conteúdos do documento final gerado. Depois';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    // Não deve ter spans vazios
    expect(result).not.toMatch(/<span class="citacao"[^>]*><\/span>/);
  });

  test('deve lidar com whitespace variado', () => {
    const sourceHtml = '<library-document title="Doc">Este   é   um   texto   com   espaços   muito   irregulares   que   precisam   ser   normalizados   corretamente.</library-document>';
    const generatedHtml = 'Cita: Este é um texto com espaços muito irregulares que precisam ser normalizados corretamente.';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    // Deve normalizar e encontrar o match
    expect(result).toContain('<span class="citacao"');
  });

  test('deve ignorar tags HTML comuns que não são metadados', () => {
    const sourceHtml = `
      <library-document title="Doc">
        <p>Este é um parágrafo completo com <b>texto em negrito destacado</b> e também <i>texto em itálico enfatizado</i> que deve ser processado corretamente.</p>
      </library-document>
    `;
    const generatedHtml = 'Cita: Este é um parágrafo completo com texto em negrito destacado e também texto em itálico enfatizado que deve ser processado corretamente.';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    expect(result).toContain('<span class="citacao"');
    // As tags <p>, <b>, <i> não devem interferir no contexto
    expect(result).toContain('documento da biblioteca');
  });

  test('deve lidar com tag que não tem event E label juntos', () => {
    const sourceHtml = `
      <custom-tag event="Evento">
        Este texto não tem o atributo label então não deve ser considerado metadado pela lógica dinâmica.
      </custom-tag>
      <another-tag label="Label">
        Este outro texto não tem o atributo event então também não deve ser considerado metadado.
      </another-tag>
      <valid-tag event="Evento" label="Label">
        Mas este texto é válido porque tem ambos os atributos event e label definidos corretamente.
      </valid-tag>
    `;
    const generatedHtml = 'Cita: Este texto não tem o atributo label então não deve ser considerado metadado pela lógica dinâmica. E: Este outro texto não tem o atributo event então também não deve ser considerado metadado. E: Mas este texto é válido porque tem ambos os atributos event e label definidos corretamente.';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);

    // Apenas a tag com event E label deve ser considerada metadado
    expect(result).toContain('EVENTO');
    expect(result).toContain('Label');
  });

  test('deve tratar corretamente textos com hífen', () => {
    const sourceHtml = '<library-document title="Doc">Trata-se de ação de concessão de aposentadoria por idade rural ajuizada por [autor] contra o Instituto Nacional do Seguro Social - INSS, em que requer a concessão do benefício previdenciário de aposentadoria rural</library-document>';
    const generatedHtml = 'Trata-se de ação de concessão de aposentadoria por idade rural ajuizada por M.E.C.V.R. contra o Instituto Nacional do Seguro Social - INSS, em que requer a concessão do benefício previdenciário de aposentadoria rural';
    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml);
    expect(result).toContain('<span class="citacao"');
    expect(result).toContain('Trata-se de ação');
  });

  test('deve limpar corretamente o contexto ao sair de tags', () => {
    const sourceHtml = `
      <library-document title="Doc">
        Texto inicial do documento.
        <library-attachment filename="anexo.pdf">
          Texto dentro do anexo.
        </library-attachment>
        Texto final do documento.
      </library-document>
    `;
    const generatedHtml = 'Cita: Texto inicial do documento. Depois: Texto dentro do anexo. Finalmente: Texto final do documento.';

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 4);
    expect(result).toContain('<span class="citacao" title="Informação extraída do documento da biblioteca, Título: Doc">Texto inicial do documento.</span>');
    expect(result).toContain('<span class="citacao" title="Informação extraída de anexo de documento da biblioteca, Título: Doc, Arq: anexo.pdf">Texto dentro do anexo.</span>');
    expect(result).toContain('<span class="citacao" title="Informação extraída do documento da biblioteca, Título: Doc">Texto final do documento.</span>');
  });

  test('deve gerenciar corretamente a pilha de contextos em todas as situações possíveis', () => {
    const sourceHtml = `
      <library-document title="Manual Principal">
        Texto raiz do manual principal antes de qualquer anexo ou página específica.
        <library-attachment filename="anexo1.pdf">
          <page number="1">
            Conteúdo da página um do primeiro anexo com informações técnicas detalhadas sobre o sistema operacional.
          </page>
          <page number="2">
            Conteúdo da página dois do primeiro anexo com mais dados complementares sobre configurações avançadas.
          </page>
          Texto entre páginas mas ainda dentro do anexo um sem número de página específico.
          <page number="3">
            Conteúdo da página três do primeiro anexo com instruções finais de instalação e manutenção.
          </page>
        </library-attachment>
        Texto entre anexos voltando ao contexto do documento principal sem anexo específico.
        <library-attachment filename="anexo2.pdf">
          <page number="1">
            Primeira página do segundo anexo com tabelas de referência técnica importantes.
          </page>
        </library-attachment>
        Texto final do documento principal após todos os anexos terem sido fechados.
      </library-document>
      <acordao event="123, 2º Grau" id="456" label="ACOR1">
        Texto inicial do acórdão antes de qualquer página numerada do processo judicial.
        <page number="5">
          Conteúdo da página cinco do acórdão com fundamentação legal detalhada sobre o caso.
        </page>
        <page number="6">
          Conteúdo da página seis do acórdão com conclusões e decisão final do tribunal.
        </page>
        Texto final do acórdão após as páginas numeradas mas ainda dentro do documento.
      </acordao>
      <library-document title="Segundo Manual">
        Início do segundo documento da biblioteca completamente separado do primeiro manual.
        <library-attachment filename="outro-anexo.pdf">
          <page number="10">
            Página dez de outro anexo em um documento totalmente diferente com novos dados.
          </page>
        </library-attachment>
      </library-document>
    `;

    const generatedHtml = `
      T1: Texto raiz do manual principal antes de qualquer anexo ou página específica.
      T2: Conteúdo da página um do primeiro anexo com informações técnicas detalhadas sobre o sistema operacional.
      T3: Conteúdo da página dois do primeiro anexo com mais dados complementares sobre configurações avançadas.
      T4: Texto entre páginas mas ainda dentro do anexo um sem número de página específico.
      T5: Conteúdo da página três do primeiro anexo com instruções finais de instalação e manutenção.
      T6: Texto entre anexos voltando ao contexto do documento principal sem anexo específico.
      T7: Primeira página do segundo anexo com tabelas de referência técnica importantes.
      T8: Texto final do documento principal após todos os anexos terem sido fechados.
      T9: Texto inicial do acórdão antes de qualquer página numerada do processo judicial.
      T10: Conteúdo da página cinco do acórdão com fundamentação legal detalhada sobre o caso.
      T11: Conteúdo da página seis do acórdão com conclusões e decisão final do tribunal.
      T12: Texto final do acórdão após as páginas numeradas mas ainda dentro do documento.
      T13: Início do segundo documento da biblioteca completamente separado do primeiro manual.
      T14: Página dez de outro anexo em um documento totalmente diferente com novos dados.
    `;

    const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 4);

    // T1: Contexto raiz do library-document (só título, sem anexo, sem página)
    expect(result).toContain('<span class="citacao" title="Informação extraída do documento da biblioteca, Título: Manual Principal">Texto raiz do manual principal');

    // T2: Dentro de library-attachment > page 1 (herda título + adiciona anexo + página)
    expect(result).toContain('<span class="citacao" title="Informação extraída de anexo de documento da biblioteca, Título: Manual Principal, Arq: anexo1.pdf, Pág: 1">Conteúdo da página um do primeiro anexo');

    // T3: Dentro de library-attachment > page 2 (mesmo anexo, página diferente)
    expect(result).toContain('<span class="citacao" title="Informação extraída de anexo de documento da biblioteca, Título: Manual Principal, Arq: anexo1.pdf, Pág: 2">Conteúdo da página dois do primeiro anexo');

    // T4: Dentro de library-attachment mas fora de page (tem anexo mas não tem página)
    expect(result).toContain('<span class="citacao" title="Informação extraída de anexo de documento da biblioteca, Título: Manual Principal, Arq: anexo1.pdf">Texto entre páginas mas ainda dentro do anexo um');

    // T5: Dentro de library-attachment > page 3
    expect(result).toContain('<span class="citacao" title="Informação extraída de anexo de documento da biblioteca, Título: Manual Principal, Arq: anexo1.pdf, Pág: 3">Conteúdo da página três do primeiro anexo');
    // T6: Voltou para library-document (fechou anexo1, volta ao contexto do documento)
    expect(result).toContain('<span class="citacao" title="Informação extraída do documento da biblioteca, Título: Manual Principal">Texto entre anexos voltando ao contexto do documento principal');

    // T7: Dentro de library-attachment 2 > page 1 (novo anexo do mesmo documento)
    expect(result).toContain('<span class="citacao" title="Informação extraída de anexo de documento da biblioteca, Título: Manual Principal, Arq: anexo2.pdf, Pág: 1">Primeira página do segundo anexo');

    // T8: Voltou para library-document (fechou anexo2, volta ao documento)
    expect(result).toContain('<span class="citacao" title="Informação extraída do documento da biblioteca, Título: Manual Principal">Texto final do documento principal após todos os anexos');

    // T9: Dentro de acordao (tag dinâmica com event e label, sem página)
    expect(result).toContain('<span class="citacao" title="Informação extraída da peça ACOR1 (e. 123, 2º GRAU)">Texto inicial do acórdão antes de qualquer página');

    // T10: Dentro de acordao > page 5 (adiciona página ao contexto do acordao)
    expect(result).toContain('<span class="citacao" title="Informação extraída da peça ACOR1 (e. 123, 2º GRAU), Pág: 5">Conteúdo da página cinco do acórdão');

    // T11: Dentro de acordao > page 6 (mesma tag dinâmica, página diferente)
    expect(result).toContain('<span class="citacao" title="Informação extraída da peça ACOR1 (e. 123, 2º GRAU), Pág: 6">Conteúdo da página seis do acórdão');

    // T12: Voltou para acordao (fechou page 6, volta ao acordao sem página)
    expect(result).toContain('<span class="citacao" title="Informação extraída da peça ACOR1 (e. 123, 2º GRAU)">Texto final do acórdão após as páginas numeradas');

    // T13: Novo library-document (contexto completamente novo, independente do anterior)
    expect(result).toContain('<span class="citacao" title="Informação extraída do documento da biblioteca, Título: Segundo Manual">Início do segundo documento da biblioteca completamente separado');

    // T14: Dentro do novo document > attachment > page (herda título do novo documento)
    expect(result).toContain('<span class="citacao" title="Informação extraída de anexo de documento da biblioteca, Título: Segundo Manual, Arq: outro-anexo.pdf, Pág: 10">Página dez de outro anexo em um documento totalmente diferente');
    // Verificações adicionais de integridade
    const spanCount = (result.match(/<span class="citacao"/g) || []).length;
    expect(spanCount).toBeGreaterThanOrEqual(14); // Pelo menos 14 citações (uma para cada T1-T14)

    // Não deve haver referência ao anexo1 no T6 (garantir que desempilhou corretamente)
    const t6Match = result.match(/T6:.*?<span class="citacao" title="([^"]*)">/);
    if (t6Match) {
      expect(t6Match[1]).not.toContain('anexo1.pdf');
      expect(t6Match[1]).not.toContain('anexo2.pdf');
    }
  });

  // ========================================
  // TESTES DE ISOLAMENTO DE BUGS ESPECÍFICOS
  // ========================================

  describe('Isolamento de bugs com tags HTML', () => {

    test('palavra única em bold deve ser marcada corretamente', () => {
      const sourceHtml = '<library-document title="Doc">Este texto tem uma palavra muito importante destacada neste contexto específico da citação.</library-document>';
      const generatedHtml = 'Cita: Este texto tem uma <b>palavra</b> muito importante destacada neste contexto específico da citação.';

      const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 8);

      // Deve marcar toda a sequência incluindo a palavra em bold
      expect(result).toContain('<span class="citacao"');
      expect(result).toContain('Este texto tem uma <b>palavra</b> muito importante');
    });

    test('múltiplas tags inline no meio da citação', () => {
      const sourceHtml = '<library-document title="Doc">O texto contém palavras em negrito e itálico e sublinhado no meio da frase longa.</library-document>';
      const generatedHtml = 'Cita: O texto contém <b>palavras</b> em <i>negrito</i> e <u>itálico</u> e <em>sublinhado</em> no meio da frase longa.';

      const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 8);

      expect(result).toContain('<span class="citacao"');
      // Todas as tags devem estar dentro da citação
      expect(result).toContain('<b>palavras</b>');
      expect(result).toContain('<i>negrito</i>');
    });

    test('tag no início da frase', () => {
      const sourceHtml = '<library-document title="Doc">Importante este é o início da frase com palavras destacadas no contexto.</library-document>';
      const generatedHtml = '<b>Importante</b> este é o início da frase com palavras destacadas no contexto.';

      const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 6);

      expect(result).toContain('<span class="citacao"');
      expect(result).toContain('<b>Importante</b>');
      // Verifica que o <b> está DENTRO do span, não fora
      expect(result).toMatch(/<span class="citacao"[^>]*><b>Importante<\/b>/);
    });

    test('tag no final da frase', () => {
      const sourceHtml = '<library-document title="Doc">Este é o texto completo com palavra destacada no final.</library-document>';
      const generatedHtml = 'Este é o texto completo com palavra destacada no <b>final</b>.';

      const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 6);

      expect(result).toContain('<span class="citacao"');
      expect(result).toContain('no <b>final</b>');
    });

    test('tags aninhadas complexas', () => {
      const sourceHtml = '<library-document title="Doc">Este texto tem formatação complexa aninhada dentro da citação longa.</library-document>';
      const generatedHtml = 'Este texto tem <b><i>formatação complexa</i></b> aninhada dentro da <u>citação</u> longa.';

      const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 6);

      expect(result).toContain('<span class="citacao"');
      expect(result).toContain('<b><i>formatação complexa</i></b>');
    });
  });

  describe('Isolamento de bugs com nao-citacao', () => {

    test('nao-citacao NÃO deve aparecer no início do texto', () => {
      const sourceHtml = '<library-document title="Doc">Este é o trecho citado que aparece depois do início do texto gerado.</library-document>';
      const generatedHtml = 'Introdução breve aqui. Este é o trecho citado que aparece depois do início do texto gerado.';

      const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 6, 5);

      // "Introdução breve aqui" NÃO deve ter nao-citacao (não está entre citações)
      expect(result).not.toContain('<span class="nao-citacao">Introdução');
      // A citação deve existir
      expect(result).toContain('<span class="citacao"');
    });

    test('nao-citacao NÃO deve aparecer no final do texto', () => {
      const sourceHtml = '<library-document title="Doc">Este é o trecho citado que aparece antes do final do texto gerado.</library-document>';
      const generatedHtml = 'Este é o trecho citado que aparece antes do final do texto gerado. Conclusão breve aqui.';

      const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 6, 5);

      // "Conclusão breve aqui" NÃO deve ter nao-citacao (não está entre citações)
      expect(result).not.toContain('<span class="nao-citacao">Conclusão');
      // A citação deve existir
      expect(result).toContain('<span class="citacao"');
    });

    test('nao-citacao DEVE aparecer entre duas citações', () => {
      const sourceHtml = `
        Primeira citação tem um texto único aqui completamente diferente mesmo.
        Segunda citação tem outro texto único aqui bem diferente também.
      `;
      const generatedHtml = 'Primeira citação tem um texto único aqui completamente diferente mesmo. Gap curto. Segunda citação tem outro texto único aqui bem diferente também.';

      const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 6, 3);

      // Deve ter duas citações
      const citacaoCount = (result.match(/<span class="citacao"/g) || []).length;
      expect(citacaoCount).toBeGreaterThanOrEqual(2);

      // "Gap curto" DEVE ter nao-citacao (está entre duas citações e tem 2 palavras <= 3)
      expect(result.match(/<span class="nao-citacao" title="[^"]*">\W*Gap curto\W*<\/span>/g)).toBeTruthy();
    });

    test('nao-citacao NÃO deve aparecer se o gap for maior que o threshold', () => {
      const sourceHtml = `
        <library-document title="Doc1">Primeira citação com texto diferente e único para evitar overlap.</library-document>
        <library-document title="Doc2">Segunda citação com texto diferente e único para evitar overlap.</library-document>
      `;
      const generatedHtml = 'Primeira citação com texto diferente e único para evitar overlap. Este é um gap muito longo com várias palavras que ultrapassa o limite. Segunda citação com texto diferente e único para evitar overlap.';

      const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 6, 3);

      // Deve ter duas citações
      const citacaoCount = (result.match(/<span class="citacao"/g) || []).length;
      expect(citacaoCount).toBeGreaterThanOrEqual(2);

      // O gap longo NÃO deve ter nao-citacao (tem mais de 3 palavras)
      expect(result).not.toContain('<span class="nao-citacao">Este é um gap muito longo');
    });

    test('nao-citacao com threshold 0 não deve marcar nada', () => {
      const sourceHtml = `
        <library-document title="Doc1">Primeira citação textos bem longos.</library-document>
        <library-document title="Doc2">Segunda citação textos bem longos.</library-document>
      `;
      const generatedHtml = 'Primeira citação textos bem longos. Gap. Segunda citação textos bem longos.';

      const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 3, 0);

      // Com threshold 0, não deve marcar nao-citacao
      expect(result).not.toContain('class="nao-citacao"');
    });

    test('múltiplos gaps pequenos entre múltiplas citações', () => {
      const sourceHtml = `
        <library-document title="Doc1">Citação um é longa e suficiente.</library-document>
        <library-document title="Doc2">Citação dois é longa e suficiente.</library-document>
        <library-document title="Doc3">Citação três é longa e suficiente.</library-document>
      `;
      const generatedHtml = 'Citação um é longa e suficiente. Gap A. Citação dois é longa e suficiente. Gap B. Citação três é longa e suficiente.';

      const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 3, 3);

      // Deve ter três citações
      const citacaoCount = (result.match(/<span class="citacao"/g) || []).length;
      expect(citacaoCount).toBeGreaterThanOrEqual(3);

      // Ambos gaps DEVEM ter nao-citacao
      expect(result.match(/<span class="nao-citacao" title="[^"]*">\W*Gap A\W*<\/span>/g)).toBeTruthy();
      expect(result.match(/<span class="nao-citacao" title="[^"]*">\W*Gap B\W*<\/span>/g)).toBeTruthy();
    });
  });

  describe('Isolamento de bugs com n-grams quebrados', () => {

    test('fonte com tags HTML inline deve permitir match completo', () => {
      const sourceHtml = '<library-document title="Doc">Este <b>texto</b> tem <i>tags</i> no meio mas deve formar n-gram completo.</library-document>';
      const generatedHtml = 'Este texto tem tags no meio mas deve formar n-gram completo.';

      const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 8);

      // Deve encontrar o match completo apesar das tags no source
      expect(result).toContain('<span class="citacao"');
      expect(result).toContain('Este texto tem tags no meio mas deve formar n-gram completo');
    });

    test('fonte com tags block-level NO MEIO da frase', () => {
      const sourceHtml = '<library-document title="Doc">Esta é uma frase que continua<p>em outro parágrafo</p> mas ainda faz parte do mesmo contexto.</library-document>';
      const generatedHtml = 'Esta é uma frase que continua em outro parágrafo mas ainda faz parte do mesmo contexto.';

      const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 6);

      // Tags block podem quebrar o n-gram, então pode não dar match completo
      // Mas deve marcar pelo menos as partes que dão match
      expect(result).toContain('<span class="citacao"');
    });

    test('gerado com tags HTML inline deve encontrar match', () => {
      const sourceHtml = '<library-document title="Doc">Este texto simples sem tags deve ser encontrado corretamente.</library-document>';
      const generatedHtml = 'Este <b>texto simples</b> sem <i>tags</i> deve ser <u>encontrado</u> corretamente.';

      const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 6);

      // Deve encontrar match completo
      expect(result).toContain('<span class="citacao"');
      expect(result).toContain('Este <b>texto simples</b>');
    });


    test('último item de lista não sendo marcado', () => {
      const sourceHtml = `
        <library-document title="Doc">
          <ol>
            <li>Primeira consideração aborda aspectos técnicos fundamentais relevantes e necessários para compreensão completa.</li>
            <li>Segunda deliberação examina questões operacionais específicas importantes e críticas para execução adequada.</li>
            <li>Terceira análise verifica elementos práticos.</li>
          </ol>
        </library-document>
      `;
      const generatedHtml = `
        <library-document title="Doc">
          <ol>
            <li>Primeira consideração aborda aspectos técnicos fundamentais relevantes e necessários para compreensão completa.</li>
            <li>Segunda deliberação examina questões operacionais específicas importantes e críticas para execução adequada.</li>
            <li>Terceira análise verifica elementos práticos.</li>
          </ol>
        </library-document>
      `;

      const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 10);

      // Todos os itens devem ser marcados (podem estar no mesmo span se não houver quebra)
      expect(result).toContain('Primeira consideração');
      expect(result).toContain('Segunda deliberação');
      expect(result).toContain('Terceira análise');

      // Deve ter pelo menos 1 citação (todo o texto é do source)
      const citacaoCount = (result.match(/<span class="citacao"/g) || []).length;
      expect(citacaoCount).toEqual(3);

      // Nenhuma parte deve ficar sem marcação de citação
      expect(result).toContain('<span class="citacao"');
    });

    test('último trecho menor que nGramSize deve ser processado', () => {
      const sourceHtml = '<library-document title="Doc">Este é um texto longo completo com bastante conteúdo para testar. Final curto.</library-document>';
      const generatedHtml = 'Este é um texto longo completo com bastante conteúdo para testar. Final curto.';

      const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 8);

      // "Final curto" tem apenas 2 palavras, mas deve ser marcado
      expect(result).toContain('Final curto');
      expect(result).toContain('<span class="citacao"');
    });
  });


  //   test('embargos de declaracao desprovidos', () => {
  //     const sourceHtml = `
  // o momento no qual é verificada a disponibilidade jurídica de renda em repetição de indébito tributário ou em reconhecimento do direito à compensação julgado procedente e já transitado em julgado, para a caracterização do fato gerador do IRPJ e da CSLL, na hipótese de créditos ilíquidos 

  //     `;
  //     const generatedHtml = `
  // <p>Discute-se, no presente caso, o momento no qual é verificada a disponibilidade jurídica de renda em repetição de indébito tributário ou em reconhecimento do direito à compensação julgado procedente e já transitado em julgado, para a caracterização do fato gerador do IRPJ e da CSLL, na hipótese de créditos ilíquidos.</p>
  //     `;

  //     const result = highlightCitationsLongestMatch(sourceHtml, generatedHtml, 8, 8);

  //     console.log('Result:', result);
  //     // O gap longo NÃO deve ter nao-citacao (tem mais de 3 palavras)
  //     expect(result).not.toContain('<li>Embargos de declaração desprovidos.</li>');
  //     // expect(result).toContain('<li><span class="citacao" title="gproc_20001282156.html (e. 72, 2º GRAU)">Embargos de declaração desprovidos.</span></li>');
  //   });

});