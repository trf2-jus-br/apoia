import { Suggestion } from './base'
import { SuggestionContext } from './context'
import { faUsers } from '@fortawesome/free-solid-svg-icons'

export const id = 'listar-partes'
export const label = 'Listar as partes'

export class ListarPartesSuggestion extends Suggestion {
  constructor() { super(id, label, faUsers) }
  resolve(ctx: SuggestionContext) {
    return this.processAwarePrompt(ctx, 'Liste as partes e seus advogados.')
  }
}

export const suggestion = new ListarPartesSuggestion()
