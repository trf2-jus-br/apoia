import AskProcessNumberModal from './modals/AskProcessNumberModal'
import { Suggestion } from './base'
import { suggestion as valorDaCausa } from './valor-da-causa'
import { suggestion as minutarSentenca } from './minutar-sentenca'
import { suggestion as minutarVoto } from './minutar-voto'
import { suggestion as resumirProcesso } from './resumir-processo'
import { suggestion as listarPartes } from './listar-partes'
import { suggestion as pontosControvertidos } from './pontos-controvertidos'
import { suggestion as argumentosDasPartes } from './argumentos-das-partes'
import { SuggestionContext, SuggestionActionResult } from './context'

const suggestions: Suggestion[] = [
  resumirProcesso,
  // listarPartes,
  // valorDaCausa,
  pontosControvertidos,
  argumentosDasPartes,
  minutarSentenca,
  minutarVoto,
]

export function getAllSuggestions(): Suggestion[] { return suggestions }

const mapById: Record<string, Suggestion> = suggestions.reduce((acc, s) => { acc[s.id] = s; return acc }, {} as Record<string, Suggestion>)
export function getSuggestion(id: string): Suggestion | undefined { return mapById[id] }

export function resolveSuggestion(id: string, ctx: SuggestionContext): SuggestionActionResult | undefined {
  const s = mapById[id]
  if (!s) return undefined
  return s.resolve(ctx)
}
