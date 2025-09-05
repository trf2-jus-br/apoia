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
// Helper sugar: ANY_EXCEPT(T.A, T.B) === ANY({ except: [T.A, T.B] })
export const ANY_EXCEPT = (...docTypes: T[]) => ANY({ except: docTypes })
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
      let currentIdx = docIdx;
      const captured: Documento[] = [];

      // 1. Always try empty (zero-length) consumption first (greedy fallback handled by recursion)
      const newPhasesEmpty = operator.phase ? addPhase(phases, operator, patternIdx, [{ operator, captured }, ...matched], documents) : phases
      const emptyMatch = matchFromIndex(
        documents,
        pattern,
        patternIdx - 1,
        currentIdx,
        [{ operator, captured }, ...matched],
        newPhasesEmpty
      )
      if (emptyMatch) return emptyMatch

      // 2. Consume backwards while not hitting an except boundary.
      while (currentIdx >= 0) {
        const currentDoc = documents[currentIdx]
        // Boundary: stop expanding when encountering an excluded type.
        if (operator.options?.except?.includes(currentDoc.tipo)) break

        if (operator.options?.capture && (operator.options.capture.length === 0 || operator.options.capture.includes(currentDoc.tipo))) {
          // unshift to preserve chronological order inside the captured slice
          captured.unshift(currentDoc)
        }

        const newPhases = operator.phase ? addPhase(phases, operator, patternIdx, [{ operator, captured }, ...matched], documents) : phases
        const matchPrev = matchFromIndex(
          documents,
          pattern,
          patternIdx - 1,
          currentIdx - 1,
          [{ operator, captured }, ...matched],
          newPhases
        )
        if (matchPrev) return matchPrev

        currentIdx--
      }
      // No match found with this ANY configuration
      return null
    }
    case 'SOME': {
      let currentIdx = docIdx;
      const captured: Documento[] = [];

      while (currentIdx >= 0) {
        const currentDoc = documents[currentIdx];
        if (operator.options?.except?.includes(currentDoc.tipo)) break

        if (operator.options?.capture && (operator.options.capture.length === 0 || operator.options.capture.includes(currentDoc.tipo)))
          captured.unshift(currentDoc)

        if (captured.length) {
          const newPhases = operator.phase ? addPhase(phases, operator, patternIdx, [{ operator, captured }, ...matched], documents) : phases
          const matchPrevious = matchFromIndex(
            documents,
            pattern,
            patternIdx - 1,
            currentIdx - 1,
            [{ operator, captured }, ...matched],
            newPhases
          )
          if (matchPrevious) return matchPrevious
        }
        currentIdx--;
      }
      return null;
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
  const ranked = [...phases].sort((a,b) => {
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

