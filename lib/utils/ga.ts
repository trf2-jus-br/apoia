// Utilitário simples para disparar eventos do Google Analytics (gtag)
// Requer que o script GA já esteja carregado (RootLayoutWithTheme injeta <GoogleAnalytics />)
// Safe no SSR e em ambientes sem GA definido.

type GAEventParams = {
  action: string
  category?: string
  label?: string
  value?: number
  // Campos extras arbitrários serão enviados como parte do evento
  [key: string]: any
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

const GA_ID = typeof window !== 'undefined' ? (window as any).GA_MEASUREMENT_ID || undefined : undefined

export function gaEvent({ action, category = 'engagement', label, value, ...rest }: GAEventParams) {
  if (typeof window === 'undefined') return
  if (!window.gtag) return // GA não carregado
  try {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value,
      ...rest,
    })
  } catch (e) {
    // não falhar silenciosamente mas evitar quebrar a UX
    if (process.env.NODE_ENV === 'development') {
      console.debug('Falha ao enviar GA event', e)
    }
  }
}

// Conveniências específicas de IA
export function trackAIStart(meta: Record<string, any>) {
  gaEvent({ action: 'ai_usage_start', category: 'ai', ...meta })
}

export function trackAIComplete(meta: Record<string, any>) {
  gaEvent({ action: 'ai_usage_complete', category: 'ai', ...meta })
}

export function trackAIError(meta: Record<string, any>) {
  gaEvent({ action: 'ai_usage_error', category: 'ai', ...meta })
}
