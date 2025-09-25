import { useEffect, useRef, useCallback } from 'react'
import { UIMessage } from 'ai'
import { trackChatUserMessage, trackChatAIStart, trackChatAIComplete, trackChatAIError } from '@/lib/utils/ga'

/**
 * Hook de instrumentação de chat (Fase 1):
 * - Eventos: chat_user_message, chat_ai_start, chat_ai_complete, chat_ai_error
 * - Sem PII: não envia conteúdo de texto, apenas metadados
 */
export function useChatAnalytics(params: {
  kind: string // 'chat' | 'chat-standalone'
  model: string | undefined
  dossierCode?: string
  messages: UIMessage[]
  error?: Error | null
}) {
  const { kind, model, dossierCode, messages, error } = params

  // Metadados internos
  const userMessageMetaRef = useRef<Map<string, { sentAt: number, turnIndex: number }>>(new Map())
  const assistantStartRef = useRef<Set<string>>(new Set())
  const assistantCompleteRef = useRef<Set<string>>(new Set())
  const assistantTimersRef = useRef<Map<string, any>>(new Map())
  const assistantLastLenRef = useRef<Map<string, number>>(new Map())
  const lastUserMessageIdRef = useRef<string | null>(null)
  const aiErrorSentRef = useRef<Set<string>>(new Set())

  const genId = () => {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) return (crypto as any).randomUUID()
    return 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9)
  }
  const estTokens = (lenChars: number) => Math.ceil(lenChars / 3.5)

  /** Cria mensagem de usuário já instrumentada */
  const createUserMessage = useCallback((text: string, fileParts: any[], options?: { suggestion?: boolean }) => {
    const id = genId()
    const turnIndex = messages.filter(m => m.role === 'user').length
    const attachmentsCount = fileParts.filter((p: any) => p.type === 'file').length
    const textLen = text.length
    trackChatUserMessage({
      client_msg_id: id,
      turn_index: turnIndex,
      len_chars: textLen,
      len_est_tokens: estTokens(textLen),
      attachments_count: attachmentsCount,
      kind,
      model: model || 'unknown',
      dossier_code: dossierCode,
      suggestion: options?.suggestion ? 1 : 0,
    })
    userMessageMetaRef.current.set(id, { sentAt: Date.now(), turnIndex })
    lastUserMessageIdRef.current = id
    const msg: UIMessage = { id, role: 'user', parts: [{ type: 'text', text }, ...fileParts] }
    return msg
  }, [messages, dossierCode, kind, model])

  // Detectar início e término de mensagens assistant
  useEffect(() => {
    messages.forEach((m, idx) => {
      if (m.role !== 'assistant') return
      const aId = m.id || `assistant-${idx}`
      // Parent = última mensagem user antes do assistant
      let parentUserId: string | null = null
      for (let i = idx - 1; i >= 0; i--) {
        if (messages[i].role === 'user') { parentUserId = messages[i].id || null; break }
      }
      if (!parentUserId) return
      const userMeta = userMessageMetaRef.current.get(parentUserId)
      if (!assistantStartRef.current.has(aId)) {
        assistantStartRef.current.add(aId)
  trackChatAIStart({ parent_user_msg_id: parentUserId, kind, turn_index: userMeta?.turnIndex ?? null, model: model || 'unknown', dossier_code: dossierCode })
      }
      const text = (m.parts || []).filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join('')
      const len = text.length
      assistantLastLenRef.current.set(aId, len)
      if (assistantTimersRef.current.has(aId)) {
        clearTimeout(assistantTimersRef.current.get(aId))
      }
      if (!assistantCompleteRef.current.has(aId)) {
        const timer = setTimeout(() => {
          if (assistantCompleteRef.current.has(aId)) return
          assistantCompleteRef.current.add(aId)
          const sentAt = userMeta?.sentAt
          const latency = sentAt ? Date.now() - sentAt : null
          trackChatAIComplete({
            parent_user_msg_id: parentUserId,
            len_chars: len,
            len_est_tokens: estTokens(len),
            latency_ms: latency,
            kind,
            model: model || 'unknown',
            dossier_code: dossierCode,
          })
        }, 1000)
        assistantTimersRef.current.set(aId, timer)
      }
    })
    // Cleanup on unmount only
    return () => {
      if (messages.length === 0) {
        assistantTimersRef.current.forEach(t => clearTimeout(t))
        assistantTimersRef.current.clear()
      }
    }
  }, [messages, kind])

  // Erros
  useEffect(() => {
    if (!error) return
    const parentId = lastUserMessageIdRef.current
    if (!parentId) return
    if (aiErrorSentRef.current.has(parentId)) return
    aiErrorSentRef.current.add(parentId)
    const userMeta = userMessageMetaRef.current.get(parentId)
    const latency = userMeta ? Date.now() - userMeta.sentAt : null
    trackChatAIError({ parent_user_msg_id: parentId, error_type: (error as any).name || 'unknown', latency_ms: latency, kind, model: model || 'unknown', dossier_code: dossierCode })
  }, [error, kind, model, dossierCode])

  return { createUserMessage }
}
