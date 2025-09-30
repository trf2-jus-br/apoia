'use client'
import NextAuthProvider from '@/app/context/nextAuthProvider'
import { ConfirmationProvider } from '@/components/confirm/ConfirmationProvider'

export default function GlobalProviders({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthProvider>
      <ConfirmationProvider>
        {children}
      </ConfirmationProvider>
    </NextAuthProvider>
  )
}
