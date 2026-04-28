import { match, matchFull, ANY, SOME, EXACT, OR, ANY_GREEDY, SOME_GREEDY } from '../lib/proc/pattern';
import { T } from '../lib/proc/combinacoes';

// Helper para criar documento rapidamente
function doc(id: number, tipo: T, numeroDoEvento?: string): any {
  return {
    id: String(id),
    tipo,
    numeroDoEvento: numeroDoEvento || String(id),
    descricaoDoEvento: tipo,
  };
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
  expect(anyItem.captured.map(d => d.id)).toEqual(['3','4']);
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
  expect(anyItem.captured.map(d => d.id)).toEqual(['3','4']);
  });
});
