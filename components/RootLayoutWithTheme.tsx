import ImportBsJS from "@/components/importBsJS"
import { Navbar, Container } from "react-bootstrap"
import NextAuthProvider from "@/app/context/nextAuthProvider"
import GlobalProviders from './GlobalProviders'
import UserMenu from "@/components/user-menu"
import Link from 'next/link'
import Image from 'next/image'
import { GoogleAnalytics } from '@next/third-parties/google'
import { envString } from "@/lib/utils/env"
import NonCorporateUserWarning from "@/components/non-corporate-user-warning"
import PrefsMigrator from "@/components/PrefsMigrator"
import { Suspense } from "react"
import { serviceMonitor } from "@/lib/interop/pdpjServiceMonitor"
import ModeLink from "./mode-link"
import { getCurrentUser, isUserCorporativo, isUserModerator } from "@/lib/user"
import { getAnonymize, getMode, isBetaTester } from "@/lib/utils/prefs"
import { AppContextValue } from "@/app/context/appContext"

// Resolve server-side os dados de aplicação (flags de usuário + modo + preferências)
// que não dependem de prompt e são expostos via AppContext a todos os filhos do
// GlobalProviders. Páginas públicas/landing (sem usuário) recebem defaults.
// As funções chamadas aqui são memoizadas por request (React cache() em
// PrefsDao.fetchPrefsRow e UserDao.getCurrentUserId), então não adicionam
// round-trips ao banco além dos que já ocorrem em UserMenu/páginas.
async function resolveAppValue(): Promise<AppContextValue> {
  const user = await getCurrentUser()
  if (!user) {
    return { isBetaTester: false, mode: 'JUDICIAL', isAnonymized: false, isModerator: false, isCorporativo: false }
  }
  return {
    isBetaTester: await isBetaTester(),
    mode: await getMode(),
    isAnonymized: await getAnonymize(),
    isModerator: await isUserModerator(user),
    isCorporativo: await isUserCorporativo(user),
  }
}

export default async function RootLayoutWithTheme({
  children, theme, sidekick = false
}: {
  children: React.ReactNode;
  theme: 'light' | 'dark';
  sidekick?: boolean;
}) {
  const appValue = await resolveAppValue()
  return (
    <html lang="pt-BR" data-theme={theme}>
      <body suppressHydrationWarning={true} className={sidekick ? 'bg-chat' : theme === 'dark' ? 'bg-dark text-light' : 'bg-light text-dark'}>
        <ImportBsJS />
        {!sidekick && <Navbar
          bg={theme}
          variant={theme === 'dark' ? 'dark' : 'light'}
          data-bs-theme={theme}
          expand="lg"
          style={{ borderBottom: `1px solid ${theme === 'dark' ? 'rgb(60,60,60)' : 'rgb(200,200,200)'}` }}
        >
          <Container fluid={false}>
            <div className="navbar-brand pt-0 pb-0" style={{ overflow: "hidden" }}>
              <ModeLink href="/" className="ms-0 me-0" style={{ verticalAlign: "middle" }}>
                <Image src="/apoia-logo-vertical-transp.png" width={48 * 1102 / 478} height={48} alt="Apoia Logo" className="me-0" style={{}} />
              </ModeLink>
            </div>
            <button className="navbar-toggler d-print-none" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
              <span className="navbar-toggler-icon"></span>
            </button>
            <Suspense fallback={null}><UserMenu /></Suspense>
          </Container>
        </Navbar>}
        <Suspense fallback={null}><NonCorporateUserWarning /></Suspense>
        <Suspense fallback={null}><PrefsMigrator /></Suspense>
        {serviceMonitor.isDown() && <div className="alert alert-warning mb-0"><div className="p-2 mb-0 container"><div className="row"><div className="col col-auto"><strong>Atenção:</strong> A Apoia está enfrentando dificuldades para acessar os serviços do Codex/DataLake. Por favor, tente novamente mais tarde.</div></div></div></div>}
        <GlobalProviders appValue={appValue}>
          <div>
            {children}
          </div>
        </GlobalProviders>
        {envString('GOOGLE_ANALYTICS_ID') && <GoogleAnalytics gaId={envString('GOOGLE_ANALYTICS_ID')} />}
      </body>
    </html>
  );
}
