import { Suggestion } from './base'
import { SuggestionContext } from './context'
import { faFileLines as faFileLinesRegular } from '@fortawesome/free-regular-svg-icons'

export const id = 'argumentos-das-partes'
export const label = 'Argumentos das partes'

export class ArgumentosDasPartesSuggestion extends Suggestion {
  constructor() { super(id, label, faFileLinesRegular) }
  resolve(ctx: SuggestionContext) {
    return this.processAwarePrompt(ctx, 'Quais são os principais argumentos das partes?')
  }
}

export const suggestion = new ArgumentosDasPartesSuggestion()
