import { T } from "./combinacoes";

// Interface para documentos do processo
export interface Documento {
  id: string
  tipo: T
  numeroDoEvento: string
  descricaoDoEvento: string
}

export interface MatchOptions {
  capture?: T[]
  except?: T[]
  greedy?: boolean // quando true, tenta consumir o máximo possível (mais distante) antes de retroceder
}

// Tipos de operadores
export type MatchOperator =
  | { type: 'EXACT'; docType: T; captureAllInSameEvent?: boolean; phase?: string }
  | { type: 'OR'; docTypes: T[]; phase?: string }
  | { type: 'ANY'; options?: MatchOptions; phase?: string }
  | { type: 'SOME'; options?: MatchOptions; phase?: string };

export const EXACT = (docType: T, captureAllInSameEvent?: boolean, phase?: string) => ({ type: 'EXACT' as const, docType, captureAllInSameEvent, phase })
export const OR = (...docTypes: T[]) => ({ type: 'OR' as const, docTypes })
export const ANY = (options?: MatchOptions, phase?: string) => ({ type: 'ANY' as const, options, phase })
export const SOME = (options?: MatchOptions, phase?: string) => ({ type: 'SOME' as const, options, phase })
// Versões explícitas que setam greedy em options
export const ANY_GREEDY = (options?: MatchOptions, phase?: string) => ANY({ ...options, greedy: true }, phase)
export const SOME_GREEDY = (options?: MatchOptions, phase?: string) => SOME({ ...options, greedy: true }, phase)
// Helper sugar: ANY_EXCEPT(T.A, T.B) === ANY({ except: [T.A, T.B] })
export const ANY_EXCEPT = (...docTypes: T[]) => ANY({ except: docTypes })
export const ANY_EXCEPT_GREEDY = (...docTypes: T[]) => ANY({ except: docTypes, greedy: true })
// PHASE marker operator (ANY vazio com phase) para marcar pontos sem capturar docs
export const PHASE = (name: string) => ANY(undefined, name)

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
  documents: Documento[],
  pattern: MatchOperator[],
  patternIdx: number,
  docIdx: number,
  matched: MatchResultItem[] = [],
  phases: PhaseMatchInfo[] = []
): MatchFullResult | null {
  if (patternIdx < 0 && docIdx < 0) {
    // resolve lastPhase
    const lastPhase = resolveLastPhase(phases)
    return { items: matched, phasesMatched: phases, lastPhase }
  }
  if (patternIdx < 0) return null

  const operator = pattern[patternIdx];
  const document: Documento = docIdx >= 0 ? documents[docIdx] : { id: null, tipo: null, numeroDoEvento: null, descricaoDoEvento: null };

  switch (operator.type) {
    case 'EXACT':
      if (document.tipo === operator.docType) {
        const captured: Documento[] = [document];
        let currentIdx = docIdx + 1;
        if (operator.captureAllInSameEvent) {
          while (currentIdx < documents.length) {
            const currentDoc = documents[currentIdx]
            if (currentDoc.numeroDoEvento !== document.numeroDoEvento) break
            captured.push(currentDoc)
            currentIdx++;
          }
        }
        const item: MatchResultItem = { operator, captured }
        const newPhases = operator.phase ? addPhase(phases, operator, patternIdx, [{ operator, captured }, ...matched], documents) : phases
        return matchFromIndex(
          documents,
          pattern,
          patternIdx - 1,
          docIdx - 1,
          [{ operator, captured }, ...matched],
          newPhases
        );
      }
      return null;
    case 'OR':
      if (operator.docTypes.includes(document.tipo)) {
        const item: MatchResultItem = { operator, captured: [document] }
        const newPhases = operator.phase ? addPhase(phases, operator, patternIdx, [{ operator, captured: [document] }, ...matched], documents) : phases
        return matchFromIndex(
          documents,
          pattern,
          patternIdx - 1,
          docIdx - 1,
          [{ operator, captured: [document] }, ...matched],
          newPhases
        );
      }
      return null;
    case 'ANY': {
      // Pré-calcula todos os consumos possíveis (0..N) e depois tenta na ordem conforme greedy
      const candidates: { captured: Documento[]; nextDocIdx: number }[] = []
      let currentIdx = docIdx
      let capturedWorking: Documento[] = []

      // Consumo zero
      candidates.push({ captured: [], nextDocIdx: currentIdx })

      while (currentIdx >= 0) {
        const currentDoc = documents[currentIdx]
        if (operator.options?.except?.includes(currentDoc.tipo)) break
        if (operator.options?.capture && (operator.options.capture.length === 0 || operator.options.capture.includes(currentDoc.tipo))) {
          capturedWorking = [currentDoc, ...capturedWorking]
        }
        currentIdx--
        candidates.push({ captured: [...capturedWorking], nextDocIdx: currentIdx })
      }

      const order = operator.options?.greedy ? [...candidates.keys()].reverse() : [...candidates.keys()]
      for (const idx of order) {
        const cand = candidates[idx]
        const item: MatchResultItem = { operator, captured: cand.captured }
        const newPhases = operator.phase ? addPhase(phases, operator, patternIdx, [item, ...matched], documents) : phases
        const attempt = matchFromIndex(
          documents,
          pattern,
          patternIdx - 1,
          cand.nextDocIdx,
          [item, ...matched],
          newPhases
        )
        if (attempt) return attempt
      }
      return null
    }
    case 'SOME': {
      const candidates: { captured: Documento[]; nextDocIdx: number }[] = []
      let currentIdx = docIdx
      let capturedWorking: Documento[] = []

      while (currentIdx >= 0) {
        const currentDoc = documents[currentIdx]
        if (operator.options?.except?.includes(currentDoc.tipo)) break
        if (operator.options?.capture && (operator.options.capture.length === 0 || operator.options.capture.includes(currentDoc.tipo))) {
          if (operator.options?.greedy) {
            // Para greedy, cada documento capturável vira um candidato isolado; não acumulamos
            candidates.push({ captured: [currentDoc], nextDocIdx: currentIdx - 1 })
          } else {
            capturedWorking = [currentDoc, ...capturedWorking]
          }
        }
        currentIdx--
        if (!operator.options?.greedy && capturedWorking.length) {
          candidates.push({ captured: [...capturedWorking], nextDocIdx: currentIdx })
        }
      }

      const order = operator.options?.greedy ? [...candidates.keys()].reverse() : [...candidates.keys()]
      for (const idx of order) {
        const cand = candidates[idx]
        const item: MatchResultItem = { operator, captured: cand.captured }
        const newPhases = operator.phase ? addPhase(phases, operator, patternIdx, [item, ...matched], documents) : phases
        const attempt = matchFromIndex(
          documents,
          pattern,
          patternIdx - 1,
          cand.nextDocIdx,
          [item, ...matched],
          newPhases
        )
        if (attempt) return attempt
      }
      return null
    }
    default:
      return null;
  }
}

function addPhase(existing: PhaseMatchInfo[], operator: MatchOperator, patternIdx: number, items: MatchResultItem[], documents: Documento[]): PhaseMatchInfo[] {
  const capturedFlat = items[0].captured // items[0] é o operador atual recém adicionado
  let lastCapturedDocIndex: number | null = null
  if (capturedFlat && capturedFlat.length) {
    const lastDoc = capturedFlat[capturedFlat.length - 1]
    const idx = documents.findIndex(d => d.id === lastDoc.id)
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

// New enriched function
export function matchFull(documents: Documento[], pattern: MatchOperator[]): MatchFullResult | null {
  const result = matchFromIndex(documents, pattern, pattern.length - 1, documents.length - 1)
  return result
}

// Backwards compatible wrapper: returns only items array like before.
export function match(documents: Documento[], pattern: MatchOperator[]): MatchResult {
  const full = matchFull(documents, pattern)
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
