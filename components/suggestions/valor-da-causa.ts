import { Suggestion } from './base'
import { SuggestionContext } from './context'
import { faSackDollar } from '@fortawesome/free-solid-svg-icons'

export const id = 'valor-da-causa'
export const label = 'Valor da causa'

export class ValorDaCausaSuggestion extends Suggestion {
  constructor() { super(id, label, faSackDollar) }
  resolve(ctx: SuggestionContext) {
    return this.processAwarePrompt(ctx, 'Qual o valor da causa?')
  }
}

export const suggestion = new ValorDaCausaSuggestion()
