'use client'
import NextAuthProvider from '@/app/context/nextAuthProvider'
import { AppProvider, AppContextValue } from '@/app/context/appContext'
import { ConfirmationProvider } from '@/components/confirm/ConfirmationProvider'

export default function GlobalProviders({ children, appValue }: { children: React.ReactNode; appValue: AppContextValue }) {
  return (
    <NextAuthProvider>
      <AppProvider value={appValue}>
        <ConfirmationProvider>
          {children}
        </ConfirmationProvider>
      </AppProvider>
    </NextAuthProvider>
  )
}
