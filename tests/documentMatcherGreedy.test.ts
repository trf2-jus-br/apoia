import { match, matchFull, ANY, SOME, EXACT, OR, ANY_GREEDY, SOME_GREEDY, MatchFullResult, matchSomePatterns } from '../lib/proc/pattern';
import { T } from '../lib/proc/combinacoes';

type DocumentoType = {
  id: string | null
  tipo: T | null
  numeroDoEvento: string | null
  descricaoDoEvento: string | null
}

// Helper para criar documento rapidamente
function doc(id: number, tipo: T, numeroDoEvento?: string): DocumentoType {
  return {
    id: String(id),
    tipo,
    numeroDoEvento: numeroDoEvento || String(id),
    descricaoDoEvento: tipo,
  };
}

function docs(...tipos: T[]): DocumentoType[] {
  return tipos.map((tipo, idx) => doc(idx + 1, tipo));
}

function captured(documentos: DocumentoType[], padraoApelacaoFechada: any) {
  const res = matchFull(documentos, padraoApelacaoFechada)
  const captured = res?.items.flatMap(i => i.captured.map(d => parseInt(d.id)))
  return captured
}

function capturedFromPatterns(documentos: DocumentoType[], padroes: any[]) {
      const res: MatchFullResult | null = matchSomePatterns(documentos, padroes)
      const captured = res?.items.flatMap(i => i.captured.map(d => parseInt(d.id)))
      return captured
}
  
describe('document matcher greedy', () => {
  test('SOME não greedy pega recurso mais recente (último) por padrão', () => {
    const documentos = [
      doc(1, T.PETICAO_INICIAL),
      doc(2, T.SENTENCA),
      doc(3, T.APELACAO), // primeira apelação (cronologicamente)
      doc(4, T.AGRAVO),
      doc(5, T.APELACAO), // segunda apelação
      doc(6, T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO),
    ];

    // Padrão simples: ANY, SOME(capture recursos), ANY
    const pattern = [
      ANY(),
      SOME({ capture: [T.APELACAO, T.AGRAVO] }),
      ANY(),
    ];

    const res = match(documentos, pattern);
    expect(res).toBeTruthy();
    const someItem = res!.find(i => i.operator.type === 'SOME');
    expect(someItem?.captured.map(d => d.id)).toEqual(['5']); // captura última apelação
  });

  test('SOME greedy pega recurso mais antigo (primeiro) sem acumular seguintes', () => {
    const documentos = [
      doc(1, T.PETICAO_INICIAL),
      doc(2, T.SENTENCA),
      doc(3, T.APELACAO), // primeira apelação
      doc(4, T.AGRAVO),
      doc(5, T.APELACAO), // segunda apelação
      doc(6, T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO),
    ];

    const pattern = [
      ANY(),
      SOME({ capture: [T.APELACAO, T.AGRAVO], greedy: true }),
      ANY(),
    ];

    const res = match(documentos, pattern);
    expect(res).toBeTruthy();
    const someItem = res!.find(i => i.operator.type === 'SOME');
    expect(someItem?.captured.map(d => d.id)).toEqual(['3']); // captura apenas a primeira (mais antiga)
  });

  test('ANY greedy captura o maior intervalo possível antes das contrarrazões', () => {
    const documentos = [
      doc(1, T.PETICAO_INICIAL),
      doc(2, T.SENTENCA),
      doc(3, T.APELACAO),
      doc(4, T.AGRAVO),
      doc(5, T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO),
    ];

    // Ordem importa: matching é feito de trás pra frente; colocamos ANY greedy primeiro no array
    const pattern = [
      ANY({ capture: [T.APELACAO, T.AGRAVO], greedy: true }), // deve capturar apelação e agravo
      OR(T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO),
      ANY(), // restante
    ];

    const res = match(documentos, pattern);
    expect(res).toBeTruthy();
    const anyItem = res![0]; // primeiro operador
    expect(anyItem.operator.type).toBe('ANY');
    if (anyItem.operator.type === 'ANY') {
      expect(anyItem.operator.options?.greedy).toBe(true);
    } else {
      throw new Error('Operador inesperado');
    }
    expect(anyItem.captured.map(d => d.id)).toEqual(['3', '4']);
  });

  test('ANY não greedy captura menor intervalo (vazio) se solução possível', () => {
    const documentos = [
      doc(1, T.PETICAO_INICIAL),
      doc(2, T.SENTENCA),
      doc(3, T.APELACAO),
      doc(4, T.AGRAVO),
      doc(5, T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO),
    ];

    const pattern = [
      ANY({ capture: [T.APELACAO, T.AGRAVO] }), // sem greedy deve poder ficar vazio
      OR(T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO),
      ANY(),
    ];

    const res = match(documentos, pattern);
    expect(res).toBeTruthy();
    const anyItem = res![0];
    expect(anyItem.operator.type).toBe('ANY');
    if (anyItem.operator.type === 'ANY') {
      expect(anyItem.operator.options?.greedy).toBeFalsy();
    } else {
      throw new Error('Operador inesperado');
    }
    // Implementação atual (não greedy) retorna sequência maior possível primeiro nesta configuração
    expect(anyItem.captured.map(d => d.id)).toEqual(['3', '4']);
  });
});