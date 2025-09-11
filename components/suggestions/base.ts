import { SuggestionContext, SuggestionActionResult } from './context'

export abstract class Suggestion {
  constructor(public id: string, public label: string, public icon: any) {}
  abstract resolve(ctx: SuggestionContext): SuggestionActionResult

  protected processAwarePrompt(ctx: SuggestionContext, prompt: string): SuggestionActionResult {
    if (ctx.processNumber || ctx.alreadyLoadedProcessMetadata) {
      return { type: 'immediate', prompt }
    }
    return {
      type: 'modal',
      key: 'ask-process-number',
      initial: {},
      onSubmit: (values, context) => {
        const numero = values?.processNumber?.trim()
        if (!numero) return
        context.setProcessNumber(numero)
        context.sendPrompt(`Sobre o processo ${numero}, ${prompt.toLowerCase()}`)
      }
    }
  }
}
