import AskProcessNumberModal from './modals/AskProcessNumberModal'
import DraftSentenceModal from './minutar-sentenca'
import { Suggestion } from './base'
import { suggestion as valorDaCausa } from './valor-da-causa'
import { suggestion as minutarSentenca } from './minutar-sentenca'
import { suggestion as resumirProcesso } from './resumir-processo'
import { suggestion as listarPartes } from './listar-partes'
import { suggestion as pontosControvertidos } from './pontos-controvertidos'
import { suggestion as argumentosDasPartes } from './argumentos-das-partes'
import { SuggestionContext, SuggestionActionResult } from './context'

const registry: Record<string, React.ComponentType<any>> = {
  'ask-process-number': AskProcessNumberModal,
  'draft-sentence': DraftSentenceModal,
}

export function getModalComponent(key: string): React.ComponentType<any> | undefined {
  return registry[key]
}

const suggestions: Suggestion[] = [
  resumirProcesso,
  listarPartes,
  valorDaCausa,
  pontosControvertidos,
  argumentosDasPartes,
  minutarSentenca,
]

export function getAllSuggestions(): Suggestion[] { return suggestions }

const mapById: Record<string, Suggestion> = suggestions.reduce((acc, s) => { acc[s.id] = s; return acc }, {} as Record<string, Suggestion>)
export function getSuggestion(id: string): Suggestion | undefined { return mapById[id] }

export function resolveSuggestion(id: string, ctx: SuggestionContext): SuggestionActionResult | undefined {
  const s = mapById[id]
  if (!s) return undefined
  return s.resolve(ctx)
}
