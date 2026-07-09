import { match, matchFull, ANY, SOME, EXACT, OR, ANY_GREEDY, SOME_GREEDY, MatchFullResult, matchSomePatterns, PHASE } from '../lib/proc/pattern';
import { padroesApelacao, padraoApelacaoAberta, padraoApelacaoFechada, T, padroesAgravo, padraoConhecimentoForcado, padroesConhecimento, padraoConhecimentoAberta, pecasRelevantes1aInstancia, FaseProcessual, padraoViabilidadeDeRecursoExtraordinarioComEmbargosDeDeclaracao, padraoEmbargosDeDeclaracaoEmAcordao } from '../lib/proc/combinacoes';

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

describe('real life scenarios', () => {
  test('find latest appeals documents', () => {
    expect(captured(docs(
      T.PETICAO_INICIAL,
      T.SENTENCA,
      T.APELACAO, // primeira apelação (cronologicamente)
      T.APELACAO, // primeira apelação (cronologicamente)
      T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO,
    ), padraoApelacaoAberta)).toEqual([1, 2, 3, 4, 5])
  });


  test('find latest appeals after other vote, dont capture contrarrazões', () => {
    expect(captured(docs(
      T.PETICAO_INICIAL,
      T.SENTENCA,
      T.APELACAO, // primeira apelação (cronologicamente)
      T.ACORDAO,
      T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO,
      T.APELACAO, // primeira apelação (cronologicamente)
      T.APELACAO, // segunda apelação
    ), padraoApelacaoAberta)).toEqual([1, 2, 6, 7])
  });


  test('find latest appeals after other acordao, opened', () => {
    expect(captured(docs(
      T.PETICAO_INICIAL,
      T.SENTENCA,
      T.APELACAO, // primeira apelação (cronologicamente)
      T.ACORDAO,
      T.APELACAO, // primeira apelação (cronologicamente)
      T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO,
      T.APELACAO, // segunda apelação
    ), padraoApelacaoAberta)).toEqual([1, 2, 5, 6, 7])
  });

  test('find latest appeals after other acordao, closed', () => {
    expect(captured(docs(
      T.PETICAO_INICIAL,
      T.SENTENCA,
      T.APELACAO, // primeira apelação (cronologicamente)
      T.ACORDAO,
      T.APELACAO, // primeira apelação (cronologicamente)
      T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO,
      T.APELACAO, // segunda apelação
      T.ACORDAO,
      T.EXTRATO_DE_ATA
    ), padraoApelacaoFechada)).toEqual([1, 2, 5, 6, 7, 8])
  });
});

describe('seleção automática do primeiro padrão que captura documentos', () => {
  test('identificar apelação aberta', () => {
    expect(capturedFromPatterns(docs(
      T.PETICAO_INICIAL,
      T.SENTENCA,
      T.APELACAO, // primeira apelação (cronologicamente)
      T.ACORDAO,
      T.APELACAO, // primeira apelação (cronologicamente)
      T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO,
      T.APELACAO, // segunda apelação
    ), padroesApelacao)).toEqual([1, 2, 5, 6, 7])
  });

  test('identificar apelação fechada', () => {
    expect(capturedFromPatterns(docs(
      T.PETICAO_INICIAL,
      T.SENTENCA,
      T.APELACAO, // primeira apelação (cronologicamente)
      T.ACORDAO,
      T.APELACAO, // primeira apelação (cronologicamente)
      T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO,
      T.APELACAO, // segunda apelação
      T.ACORDAO,
      T.EXTRATO_DE_ATA
    ), padroesApelacao)).toEqual([1, 2, 5, 6, 7, 8])
  });

  test('identificar agravo aberto', () => {
    expect(capturedFromPatterns(docs(
      T.PETICAO_INICIAL,
      T.DESPACHO_DECISAO,
      T.AGRAVO,
      T.CONTRARRAZOES
    ), padroesAgravo)).toEqual([1, 2, 3, 4])
  });

  test('identificar padrôes de primeira instância', () => {
    expect(capturedFromPatterns(docs(
      T.PETICAO_INICIAL,
      T.LAUDO,
      T.DESPACHO_DECISAO,
      T.LAUDO,
      T.CONTESTACAO,
      T.CONTESTACAO
    ), [...padroesConhecimento]))
      .toEqual([1, 2, 3, 4, 5, 6])
  });

  
  test('identificar embargos de declaração em acórdão', () => {
    expect(capturedFromPatterns(docs(
      T.PETICAO_INICIAL,
      T.SENTENCA,
      T.APELACAO,
      T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO,
      T.PARECER,
      T.EMBARGOS_DE_DECLARACAO,
      T.RELATORIO,
      T.VOTO,
      T.ACORDAO,
      T.EMBARGOS_DE_DECLARACAO,
      T.CONTRARRAZOES,
    ), [padraoEmbargosDeDeclaracaoEmAcordao])).toEqual([7,8,9,10,11])
  });

});