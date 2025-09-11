import { Suggestion } from './base'
import { SuggestionContext } from './context'
import { faFileLines } from '@fortawesome/free-solid-svg-icons'

export const id = 'resumir-processo'
export const label = 'Resumir o processo'

export class ResumirProcessoSuggestion extends Suggestion {
  constructor() { super(id, label, faFileLines) }
  resolve(ctx: SuggestionContext) {
    return this.processAwarePrompt(ctx, 'Resuma o processo em um parágrafo.')
  }
}

export const suggestion = new ResumirProcessoSuggestion()
