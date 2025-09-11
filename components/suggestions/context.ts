import { UIMessage } from 'ai'

export type SuggestionContext = {
  processNumber?: string
  setProcessNumber: (n?: string) => void
  alreadyLoadedProcessMetadata: boolean
  messages: UIMessage[]
  sendPrompt: (text: string) => void
}

export type ImmediateAction = { type: 'immediate', prompt: string }
export type OpenModalAction = { 
  type: 'modal', 
  key: string, 
  initial?: any,
  onSubmit?: (values: any, ctx: SuggestionContext) => void
}

export type SuggestionActionResult = ImmediateAction | OpenModalAction

export type SuggestionAction = (ctx: SuggestionContext) => SuggestionActionResult

export type ModalProps<TDraft = any> = {
  show: boolean
  context: SuggestionContext
  initial?: any
  draft?: TDraft
  onSubmit: (values: any) => void
  onClose: () => void
}
