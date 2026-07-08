import { T } from "./combinacoes";

// Interface para documentos do processo
export interface Documento {
  kind?: 'documento'
  id: string
  tipo: T
  numeroDoEvento: string
  descricaoDoEvento: string
}

// Interface para eventos/movimentos do processo (sem documento associado)
export interface Evento {
  kind: 'evento'
  sequencia: number
  descricao: string
  tipoNome?: string
  id?: number | null
}

// Union type para itens na sequência de matching
export type SequenceItem = Documento | Evento

// Type guards
export function isDocumento(item: SequenceItem): item is Documento {
  return item.kind !== 'evento'
}
export function isEvento(item: SequenceItem): item is Evento {
  return item.kind === 'evento'
}

// Critério de matching para eventos
export interface EventMatch {
  descricao?: string | RegExp
  tipoNome?: string | RegExp
  id?: number | number[]
}

function matchesEventCriteria(evento: Evento, criteria: EventMatch): boolean {
  if (criteria.descricao !== undefined) {
    if (typeof criteria.descricao === 'string') {
      if (evento.descricao !== criteria.descricao) return false
    } else {
      if (!criteria.descricao.test(evento.descricao)) return false
    }
  }
  if (criteria.tipoNome !== undefined) {
    if (typeof criteria.tipoNome === 'string') {
      if (evento.tipoNome !== criteria.tipoNome) return false
    } else {
      if (!evento.tipoNome || !criteria.tipoNome.test(evento.tipoNome)) return false
    }
  }
  if (criteria.id !== undefined) {
    if (typeof criteria.id === 'number') {
      if (evento?.id !== criteria.id) return false
    } else {
      if (!evento?.id || !criteria.id.includes(evento.id)) return false
    }
  }
  return true
}

export interface MatchOptions {
  capture?: T[]
  except?: T[]
  exceptEvent?: EventMatch[]
  greedy?: boolean // quando true, tenta consumir o máximo possível (mais distante) antes de retroceder
}

// Tipos de operadores
export type MatchOperator =
  | { type: 'EXACT'; docType: T; captureAllInSameEvent?: boolean; phase?: string }
  | { type: 'OR'; docTypes: T[]; phase?: string }
  | { type: 'ANY'; options?: MatchOptions; phase?: string }
  | { type: 'SOME'; options?: MatchOptions; phase?: string }
  | { type: 'EVENT'; criteria: EventMatch; phase?: string }
  | { type: 'ALT'; options: MatchOperator[][]; phase?: string }
  | { type: 'SKIP'; options?: MatchOperator[][]; phase?: string };

export const EXACT = (docType: T, captureAllInSameEvent?: boolean, phase?: string) => ({ type: 'EXACT' as const, docType, captureAllInSameEvent, phase })
export const OR = (...docTypes: T[]) => ({ type: 'OR' as const, docTypes })
export const ANY = (options?: MatchOptions, phase?: string) => ({ type: 'ANY' as const, options, phase })
export const SOME = (options?: MatchOptions, phase?: string) => ({ type: 'SOME' as const, options, phase })
export const EVENT = (criteria: EventMatch, phase?: string) => ({ type: 'EVENT' as const, criteria, phase })
// ALT: alternativa posicional. Tenta cada opção em ordem; a primeira que casar vence.
// Use ALT(A, []) para tornar A opcional. PHASEs dentro da opção vencedora são
// preservados em phasesMatched.
export const ALT = (...alternatives: MatchOperator[][]) => ({ type: 'ALT' as const, options: alternatives })
// Versões explícitas que setam greedy em options
export const ANY_GREEDY = (options?: MatchOptions, phase?: string) => ANY({ ...options, greedy: true }, phase)
export const SOME_GREEDY = (options?: MatchOptions, phase?: string) => SOME({ ...options, greedy: true }, phase)
// Helper sugar: ANY_EXCEPT(T.A, T.B) === ANY({ except: [T.A, T.B] })
export const ANY_EXCEPT = (...docTypes: T[]) => ANY({ except: docTypes })
export const ANY_EXCEPT_GREEDY = (...docTypes: T[]) => ANY({ except: docTypes, greedy: true })
export const PHASE = (name: string) => ({ type: 'SKIP' as const, phase: name })

export type MatchResultItem = { operator: MatchOperator, captured: Documento[] }

export interface PhaseMatchInfo {
  phase: string
  operatorPatternIndex: number // posição do operador no pattern original
  resultIndex: number          // posição no array de items result
  lastCapturedDocIndex: number | null
}

export interface MatchFullResult {
  items: MatchResultItem[]
  phasesMatched: PhaseMatchInfo[]
  lastPhase?: PhaseMatchInfo
}

// Legacy (compat) result type kept as array of MatchResultItem or null.
// New enriched API is matchFull returning MatchFullResult | null.
export type MatchResult = MatchResultItem[] | null

function matchFromIndex(
  items: SequenceItem[],
  pattern: MatchOperator[],
  patternIdx: number,
  itemIdx: number,
  matched: MatchResultItem[] = [],
  phases: PhaseMatchInfo[] = []
): MatchFullResult | null {
  if (patternIdx < 0 && itemIdx < 0) {
    // resolve lastPhase
    const lastPhase = resolveLastPhase(phases)
    return { items: matched, phasesMatched: phases, lastPhase }
  }
  if (patternIdx < 0) return null

  const operator = pattern[patternIdx];
  const currentItem: SequenceItem | null = itemIdx >= 0 ? items[itemIdx] : null;

  switch (operator.type) {
    case 'EXACT': {
      // EXACT só faz match com documentos, nunca com eventos
      if (!currentItem || isEvento(currentItem)) return null
      const document = currentItem
      if (document.tipo === operator.docType) {
        const captured: Documento[] = [document];
        let currentIdx = itemIdx + 1;
        if (operator.captureAllInSameEvent) {
          while (currentIdx < items.length) {
            const nextItem = items[currentIdx]
            if (isEvento(nextItem)) break
            if (nextItem.numeroDoEvento !== document.numeroDoEvento) break
            captured.push(nextItem)
            currentIdx++;
          }
        }
        const matchItem: MatchResultItem = { operator, captured }
        const newPhases = operator.phase ? addPhase(phases, operator, patternIdx, [matchItem, ...matched], items) : phases
        return matchFromIndex(
          items,
          pattern,
          patternIdx - 1,
          itemIdx - 1,
          [matchItem, ...matched],
          newPhases
        );
      }
      return null;
    }
    case 'OR': {
      // OR só faz match com documentos, nunca com eventos
      if (!currentItem || isEvento(currentItem)) return null
      const document = currentItem
      if (operator.docTypes.includes(document.tipo)) {
        const matchItem: MatchResultItem = { operator, captured: [document] }
        const newPhases = operator.phase ? addPhase(phases, operator, patternIdx, [matchItem, ...matched], items) : phases
        return matchFromIndex(
          items,
          pattern,
          patternIdx - 1,
          itemIdx - 1,
          [matchItem, ...matched],
          newPhases
        );
      }
      return null;
    }
    case 'EVENT': {
      // EVENT só faz match com eventos, nunca com documentos
      if (!currentItem || !isEvento(currentItem)) return null
      if (matchesEventCriteria(currentItem, operator.criteria)) {
        const matchItem: MatchResultItem = { operator, captured: [] }
        const newPhases = operator.phase ? addPhase(phases, operator, patternIdx, [matchItem, ...matched], items) : phases
        return matchFromIndex(
          items,
          pattern,
          patternIdx - 1,
          itemIdx - 1,
          [matchItem, ...matched],
          newPhases
        );
      }
      return null;
    }
    case 'ANY': {
      // Pré-calcula todos os consumos possíveis (0..N) e depois tenta na ordem conforme greedy
      const candidates: { captured: Documento[]; nextItemIdx: number }[] = []
      let currentIdx = itemIdx
      let capturedWorking: Documento[] = []

      // Consumo zero
      candidates.push({ captured: [], nextItemIdx: currentIdx })

      while (currentIdx >= 0) {
        const item = items[currentIdx]
        if (isEvento(item)) {
          // Verifica exceptEvent: se o evento bate com algum critério, para
          if (operator.options?.exceptEvent?.some(criteria => matchesEventCriteria(item, criteria))) break
          // Evento não bloqueado: consome sem capturar
          currentIdx--
          candidates.push({ captured: [...capturedWorking], nextItemIdx: currentIdx })
          continue
        }
        // É um documento
        if (operator.options?.except?.includes(item.tipo)) break
        if (operator.options?.capture && (operator.options.capture.length === 0 || operator.options.capture.includes(item.tipo))) {
          capturedWorking = [item, ...capturedWorking]
        }
        currentIdx--
        candidates.push({ captured: [...capturedWorking], nextItemIdx: currentIdx })
      }

      const order = operator.options?.greedy ? [...candidates.keys()].reverse() : [...candidates.keys()]
      for (const idx of order) {
        const cand = candidates[idx]
        const matchItem: MatchResultItem = { operator, captured: cand.captured }
        const newPhases = operator.phase ? addPhase(phases, operator, patternIdx, [matchItem, ...matched], items) : phases
        const attempt = matchFromIndex(
          items,
          pattern,
          patternIdx - 1,
          cand.nextItemIdx,
          [matchItem, ...matched],
          newPhases
        )
        if (attempt) return attempt
      }
      return null
    }
    case 'SOME': {
      const candidates: { captured: Documento[]; nextItemIdx: number }[] = []
      let currentIdx = itemIdx
      let capturedWorking: Documento[] = []

      while (currentIdx >= 0) {
        const item = items[currentIdx]
        if (isEvento(item)) {
          // Verifica exceptEvent
          if (operator.options?.exceptEvent?.some(criteria => matchesEventCriteria(item, criteria))) break
          // Evento não bloqueado: consome sem capturar
          currentIdx--
          if (!operator.options?.greedy && capturedWorking.length) {
            candidates.push({ captured: [...capturedWorking], nextItemIdx: currentIdx })
          }
          continue
        }
        // É um documento
        if (operator.options?.except?.includes(item.tipo)) break
        if (operator.options?.capture && (operator.options.capture.length === 0 || operator.options.capture.includes(item.tipo))) {
          if (operator.options?.greedy) {
            // Para greedy, cada documento capturável vira um candidato isolado; não acumulamos
            candidates.push({ captured: [item], nextItemIdx: currentIdx - 1 })
          } else {
            capturedWorking = [item, ...capturedWorking]
          }
        }
        currentIdx--
        if (!operator.options?.greedy && capturedWorking.length) {
          candidates.push({ captured: [...capturedWorking], nextItemIdx: currentIdx })
        }
      }

      const order = operator.options?.greedy ? [...candidates.keys()].reverse() : [...candidates.keys()]
      for (const idx of order) {
        const cand = candidates[idx]
        const matchItem: MatchResultItem = { operator, captured: cand.captured }
        const newPhases = operator.phase ? addPhase(phases, operator, patternIdx, [matchItem, ...matched], items) : phases
        const attempt = matchFromIndex(
          items,
          pattern,
          patternIdx - 1,
          cand.nextItemIdx,
          [matchItem, ...matched],
          newPhases
        )
        if (attempt) return attempt
      }
      return null
    }
    case 'ALT': {
      // Tenta cada alternativa em ordem; a primeira que casa vence.
      //
      if (operator.options.length === 0) return null

      const basePhases = [...phases]

      for (const alt of operator.options) {
        // Caso especial: alternativa vazia no início da pattern, força o retorno do encontrado até agora.
        if (alt.length === 0 && patternIdx === 0) {
          return matchFromIndex(items, pattern, -1, -1, matched, phases)
        }

        const patternAlt = [...pattern.slice(0, patternIdx), ...alt]
        const patternIdxAlt = patternAlt.length - 1
        const itemIdxAlt = itemIdx
        const matchedAlt: MatchResultItem[] = [...matched]
        const phasesAlt = operator.phase ? addPhase(basePhases, operator, patternIdx, matchedAlt, items) : basePhases

        const attempt = matchFromIndex(
          items,
          patternAlt,
          patternIdxAlt,
          itemIdxAlt,
          matchedAlt,
          phasesAlt
        )
        if (attempt) return attempt
      }
      return null
    }
    case 'SKIP': {
      const newPhases = operator.phase ? addPhase(phases, operator, patternIdx, [...matched], items) : phases
      return matchFromIndex(
        items,
        pattern,
        patternIdx - 1,
        itemIdx,
        [...matched],
        newPhases
      );
    }
    default:
      return null;
  }
}

function addPhase(existing: PhaseMatchInfo[], operator: MatchOperator, patternIdx: number, matchedItems: MatchResultItem[], sequence: SequenceItem[]): PhaseMatchInfo[] {
  const capturedFlat = matchedItems[0].captured // matchedItems[0] é o operador atual recém adicionado
  let lastCapturedDocIndex: number | null = null
  if (capturedFlat && capturedFlat.length) {
    const lastDoc = capturedFlat[capturedFlat.length - 1]
    const idx = sequence.findIndex(item => isDocumento(item) && item.id === lastDoc.id)
    lastCapturedDocIndex = idx >= 0 ? idx : null
  }
  const resultIndex = 0 // posição ainda não final; ajustaremos quando resolver lastPhase (recalcular após match)
  return [...existing, { phase: operator.phase!, operatorPatternIndex: patternIdx, resultIndex, lastCapturedDocIndex }]
}

function resolveLastPhase(phases: PhaseMatchInfo[]): PhaseMatchInfo | undefined {
  if (!phases.length) return undefined
  // Recalcular resultIndex e lastCapturedDocIndex ordering stable
  // Já temos lastCapturedDocIndex potencial (pode ser null). Escolha: preferir quem tem índice e é mais à direita (menor patternIdx significa mais cedo, então usamos maior operatorPatternIndex)
  // Estratégia: ordenar cópia sem mutar original
  const ranked = [...phases].sort((a, b) => {
    const aHas = a.lastCapturedDocIndex !== null
    const bHas = b.lastCapturedDocIndex !== null
    if (aHas !== bHas) return aHas ? -1 : 1 // queremos priorizar quem capturou (invertido depois)
    if (aHas && bHas && a.lastCapturedDocIndex !== b.lastCapturedDocIndex) return b.lastCapturedDocIndex! - a.lastCapturedDocIndex!
    return b.operatorPatternIndex - a.operatorPatternIndex
  })
  return ranked[0]
}

// New enriched function — aceita Documento[] (retrocompatível) ou SequenceItem[]
export function matchFull(sequence: SequenceItem[], pattern: MatchOperator[]): MatchFullResult | null {
  const result = matchFromIndex(sequence, pattern, pattern.length - 1, sequence.length - 1)
  return result
}

// Backwards compatible wrapper: returns only items array like before.
export function match(sequence: SequenceItem[], pattern: MatchOperator[]): MatchResult {
  const full = matchFull(sequence, pattern)
  if (!full) return null
  return full.items
}

export function matchSomePatterns(documents: Documento[], padroes: MatchOperator[][]): MatchFullResult | null {
  const matches: MatchFullResult[] = []
  for (const padrao of padroes) {
    const m = matchFull(documents, padrao)
    if (m !== null && m.items.length > 0) {
      return m
    }
  }
  return null
}
