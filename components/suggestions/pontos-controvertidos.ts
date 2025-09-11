import { Suggestion } from './base'
import { SuggestionContext } from './context'
import { faQuestionCircle } from '@fortawesome/free-regular-svg-icons'

export const id = 'pontos-controvertidos'
export const label = 'Pontos controvertidos'

export class PontosControvertidosSuggestion extends Suggestion {
  constructor() { super(id, label, faQuestionCircle) }
  resolve(ctx: SuggestionContext) {
    return this.processAwarePrompt(ctx, 'Quais são os pontos ainda controvertidos?')
  }
}

export const suggestion = new PontosControvertidosSuggestion()
