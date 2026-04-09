import { match, matchFull, ANY, SOME, EXACT, OR, EVENT, Documento, Evento, SequenceItem, MatchResultItem } from '../lib/proc/pattern';
import { T } from '../lib/proc/combinacoes';
import test, { describe } from 'node:test';

// Helper para criar documento
function doc(id: number, tipo: T, numeroDoEvento?: string): Documento {
  return {
    id: String(id),
    tipo,
    numeroDoEvento: numeroDoEvento || String(id),
    descricaoDoEvento: tipo,
  };
}

// Helper para criar evento
function evt(sequencia: number, descricao: string, tipoNome?: string): Evento {
  return {
    kind: 'evento',
    sequencia,
    descricao,
    tipoNome,
  };
}

describe('EVENT operator', () => {
  test('EVENT matches an event by exact descricao', () => {
    const sequence: SequenceItem[] = [
      doc(1, T.PETICAO_INICIAL),
      evt(10, 'Distribuição'),
      doc(2, T.SENTENCA),
    ];
    const pattern = [ANY(), EVENT({ descricao: 'Distribuição' }), ANY()];
    const result = match(sequence, pattern);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(3);
    // EVENT captura vazio
    expect(result![1].captured).toEqual([]);
    expect(result![1].operator.type).toBe('EVENT');
  });

  test('EVENT matches an event by regex descricao', () => {
    const sequence: SequenceItem[] = [
      doc(1, T.PETICAO_INICIAL),
      evt(10, 'Distribuição automática'),
      doc(2, T.SENTENCA),
    ];
    const pattern = [ANY(), EVENT({ descricao: /distribuição/i }), ANY()];
    const result = match(sequence, pattern);
    expect(result).not.toBeNull();
  });

  test('EVENT does not match a document', () => {
    const sequence: SequenceItem[] = [
      doc(1, T.PETICAO_INICIAL),
      doc(2, T.SENTENCA),
    ];
    const pattern = [ANY(), EVENT({ descricao: 'anything' }), ANY()];
    const result = match(sequence, pattern);
    expect(result).toBeNull();
  });

  test('EVENT matches by tipoNome', () => {
    const sequence: SequenceItem[] = [
      doc(1, T.PETICAO_INICIAL),
      evt(10, 'Julgamento', 'Decisão'),
      doc(2, T.SENTENCA),
    ];
    const pattern = [ANY(), EVENT({ tipoNome: 'Decisão' }), ANY()];
    const result = match(sequence, pattern);
    expect(result).not.toBeNull();
  });

  test('EVENT matches by tipoNome regex', () => {
    const sequence: SequenceItem[] = [
      doc(1, T.PETICAO_INICIAL),
      evt(10, 'Julgamento', 'Decisão Monocrática'),
      doc(2, T.SENTENCA),
    ];
    const pattern = [ANY(), EVENT({ tipoNome: /decisão/i }), ANY()];
    const result = match(sequence, pattern);
    expect(result).not.toBeNull();
  });

  test('EVENT with both descricao and tipoNome requires both to match (AND)', () => {
    const sequence: SequenceItem[] = [
      evt(10, 'Julgamento', 'Decisão'),
    ];
    // Both match
    const pattern1 = [EVENT({ descricao: 'Julgamento', tipoNome: 'Decisão' })];
    expect(match(sequence, pattern1)).not.toBeNull();

    // descricao matches, tipoNome doesn't
    const pattern2 = [EVENT({ descricao: 'Julgamento', tipoNome: 'Sentença' })];
    expect(match(sequence, pattern2)).toBeNull();
  });

  test('EVENT does not match when descricao is wrong', () => {
    const sequence: SequenceItem[] = [
      evt(10, 'Distribuição'),
    ];
    const pattern = [EVENT({ descricao: 'Julgamento' })];
    expect(match(sequence, pattern)).toBeNull();
  });

  test('EVENT does not match when tipoNome is undefined in evento but criteria requires it', () => {
    const sequence: SequenceItem[] = [
      evt(10, 'Distribuição'), // tipoNome undefined
    ];
    const pattern = [EVENT({ tipoNome: /algo/i })];
    expect(match(sequence, pattern)).toBeNull();
  });
});

describe('EXACT and OR with events in sequence', () => {
  test('EXACT skips over events - does not match events', () => {
    const sequence: SequenceItem[] = [
      evt(10, 'Distribuição'),
    ];
    const pattern = [EXACT(T.PETICAO_INICIAL)];
    expect(match(sequence, pattern)).toBeNull();
  });

  test('OR skips over events - does not match events', () => {
    const sequence: SequenceItem[] = [
      evt(10, 'Distribuição'),
    ];
    const pattern = [OR(T.PETICAO_INICIAL, T.SENTENCA)];
    expect(match(sequence, pattern)).toBeNull();
  });
});

describe('ANY/SOME with events', () => {
  test('ANY consumes events transparently (no capture)', () => {
    const sequence: SequenceItem[] = [
      doc(1, T.PETICAO_INICIAL),
      evt(10, 'Distribuição'),
      doc(2, T.SENTENCA),
      evt(20, 'Julgamento'),
      doc(3, T.APELACAO),
    ];
    const pattern = [
      EXACT(T.PETICAO_INICIAL),
      ANY({ capture: [] }),
      EXACT(T.APELACAO),
    ];
    const result = match(sequence, pattern);
    expect(result).not.toBeNull();
    // ANY captura apenas documentos, não eventos
    const captured = result![1].captured;
    expect(captured.every(d => 'tipo' in d)).toBe(true);
    // Deve ter capturado SENTENCA
    expect(captured.map(d => d.tipo)).toContain(T.SENTENCA);
  });

  test('SOME consumes events transparently', () => {
    const sequence: SequenceItem[] = [
      doc(1, T.PETICAO_INICIAL),
      evt(10, 'Distribuição'),
      doc(2, T.SENTENCA),
    ];
    const pattern = [
      SOME({ capture: [T.PETICAO_INICIAL, T.SENTENCA] }),
    ];
    const result = match(sequence, pattern);
    expect(result).not.toBeNull();
    const captured = result![0].captured;
    expect(captured.length).toBe(2);
    expect(captured[0].tipo).toBe(T.PETICAO_INICIAL);
    expect(captured[1].tipo).toBe(T.SENTENCA);
  });
});

describe('exceptEvent in ANY/SOME', () => {
  test('ANY stops at event matching exceptEvent criteria', () => {
    const sequence: SequenceItem[] = [
      doc(1, T.PETICAO_INICIAL),
      evt(10, 'Julgamento'),
      doc(2, T.SENTENCA),
      doc(3, T.APELACAO),
    ];
    // Para forçar o ANY a consumir, ancorar com EXACT antes e EVENT
    const pattern = [
      EXACT(T.PETICAO_INICIAL),
      EVENT({ descricao: 'Julgamento' }),
      ANY({ capture: [], exceptEvent: [{ descricao: 'Julgamento' }] }),
    ];
    const result = match(sequence, pattern);
    expect(result).not.toBeNull();
    // ANY capturou SENTENCA e APELACAO (parou antes do evento, que já foi consumido)
    const anyCapture = result![2].captured;
    expect(anyCapture.map(d => d.tipo)).toEqual([T.SENTENCA, T.APELACAO]);
  });

  test('ANY with exceptEvent prevents crossing an event boundary', () => {
    const sequence: SequenceItem[] = [
      doc(1, T.PETICAO_INICIAL),
      doc(2, T.SENTENCA),
      evt(20, 'Julgamento'),
      doc(3, T.APELACAO),
      doc(4, T.CERTIDAO),
    ];
    // Sem exceptEvent, ANY consome tudo incluindo eventos
    // Com exceptEvent, ANY para no evento "Julgamento"
    const pattern = [
      EXACT(T.PETICAO_INICIAL),
      ANY(),
      EXACT(T.APELACAO),
      ANY({ capture: [T.CERTIDAO], exceptEvent: [{ descricao: 'Julgamento' }] }),
    ];
    // A última ANY não pode cruzar o evento "Julgamento" para trás
    // Então: EXACT(APELACAO) ancora no doc(3), última ANY captura CERTIDAO, ANY do meio consome SENTENCA+evt
    const result = match(sequence, pattern);
    expect(result).not.toBeNull();
    expect(result![2].captured[0].tipo).toBe(T.APELACAO);
    expect(result![3].captured.map(d => d.tipo)).toEqual([T.CERTIDAO]);
  });

  test('SOME stops at event matching exceptEvent criteria', () => {
    const sequence: SequenceItem[] = [
      doc(1, T.PETICAO_INICIAL),
      evt(10, 'Julgamento'),
      doc(2, T.SENTENCA),
      doc(3, T.APELACAO),
    ];
    const pattern = [
      EXACT(T.PETICAO_INICIAL),
      EVENT({ descricao: 'Julgamento' }),
      SOME({ capture: [T.SENTENCA, T.APELACAO], exceptEvent: [{ descricao: 'Julgamento' }] }),
    ];
    const result = match(sequence, pattern);
    expect(result).not.toBeNull();
    const captured = result![2].captured;
    expect(captured.length).toBe(2);
    expect(captured.map(d => d.tipo)).toEqual([T.SENTENCA, T.APELACAO]);
  });

  test('exceptEvent with regex', () => {
    const sequence: SequenceItem[] = [
      doc(1, T.PETICAO_INICIAL),
      evt(10, 'Julgamento Final'),
      doc(2, T.SENTENCA),
    ];
    const pattern = [
      EXACT(T.PETICAO_INICIAL),
      EVENT({ descricao: /julgamento/i }),
      ANY({ capture: [], exceptEvent: [{ descricao: /julgamento/i }] }),
    ];
    const result = match(sequence, pattern);
    expect(result).not.toBeNull();
    // ANY capturou SENTENCA
    expect(result![2].captured.length).toBe(1);
    expect(result![2].captured[0].tipo).toBe(T.SENTENCA);
  });

  test('exceptEvent OR semantics - any criteria match stops', () => {
    const sequence: SequenceItem[] = [
      doc(1, T.PETICAO_INICIAL),
      evt(10, 'Distribuição'),
      doc(2, T.SENTENCA),
      evt(20, 'Julgamento'),
      doc(3, T.APELACAO),
    ];
    // Ancora no Julgamento, ANY após com exceptEvent que para em ambos os eventos
    const pattern = [
      ANY(),
      EVENT({ descricao: 'Julgamento' }),
      ANY({
        capture: [],
        exceptEvent: [
          { descricao: 'Distribuição' },
          { descricao: 'Julgamento' },
        ]
      }),
    ];
    const result = match(sequence, pattern);
    expect(result).not.toBeNull();
    // ANY após Julgamento captura apenas APELACAO (sem mais eventos adiante)
    expect(result![2].captured.map(d => d.tipo)).toEqual([T.APELACAO]);
  });
});

describe('EVENT + ANY composition for capturing docs after event', () => {
  test('EVENT followed by ANY captures docs until next event boundary', () => {
    const sequence: SequenceItem[] = [
      doc(1, T.PETICAO_INICIAL),
      evt(10, 'Distribuição'),
      doc(2, T.SENTENCA),
      doc(3, T.CERTIDAO),
      evt(20, 'Julgamento'),
      doc(4, T.APELACAO),
    ];
    const pattern = [
      ANY(),
      EVENT({ descricao: 'Julgamento' }),
      ANY({ capture: [], exceptEvent: [{ descricao: /./  }] }), // para em qualquer evento
    ];
    const result = match(sequence, pattern);
    expect(result).not.toBeNull();
    // EVENT matched "Julgamento", ANY after it captured APELACAO
    expect(result![2].captured.map(d => d.tipo)).toEqual([T.APELACAO]);
  });

  test('Full pattern: docs before event, event, docs after event', () => {
    const sequence: SequenceItem[] = [
      doc(1, T.PETICAO_INICIAL),
      doc(2, T.CONTESTACAO),
      evt(10, 'Sentença Proferida'),
      doc(3, T.SENTENCA),
      doc(4, T.CERTIDAO),
    ];
    const pattern = [
      EXACT(T.PETICAO_INICIAL),
      ANY(),
      EVENT({ descricao: /sentença/i }),
      ANY({ capture: [T.SENTENCA] }),
    ];
    const result = match(sequence, pattern);
    expect(result).not.toBeNull();
    // Captured SENTENCA after the event
    expect(result![3].captured.length).toBe(1);
    expect(result![3].captured[0].tipo).toBe(T.SENTENCA);
  });
});

describe('backward compatibility - sequences without events', () => {
  test('pure document sequences work exactly as before', () => {
    const documentos = [
      doc(1, T.PETICAO_INICIAL),
      doc(2, T.SENTENCA),
      doc(3, T.APELACAO),
    ];
    const pattern = [
      EXACT(T.PETICAO_INICIAL),
      ANY(),
      EXACT(T.APELACAO),
    ];
    const result = match(documentos, pattern);
    expect(result).not.toBeNull();
    expect(result![0].captured[0].tipo).toBe(T.PETICAO_INICIAL);
    expect(result![2].captured[0].tipo).toBe(T.APELACAO);
  });

  test('documents without kind field work (backward compat)', () => {
    // Old-style documents without kind field should still work
    const documentos = [
      { id: '1', tipo: T.PETICAO_INICIAL, numeroDoEvento: '1', descricaoDoEvento: 'test' },
      { id: '2', tipo: T.SENTENCA, numeroDoEvento: '2', descricaoDoEvento: 'test' },
    ];
    const pattern = [EXACT(T.PETICAO_INICIAL), ANY()];
    const result = match(documentos as any, pattern);
    expect(result).not.toBeNull();
  });
});
function expect(result: MatchResultItem[]) {
    throw new Error('Function not implemented.');
}

