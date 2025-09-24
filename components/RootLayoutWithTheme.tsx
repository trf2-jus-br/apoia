import ImportBsJS from "@/components/importBsJS"
import { Navbar, Container } from "react-bootstrap"
import NextAuthProvider from "@/app/context/nextAuthProvider"
import UserMenu from "@/components/user-menu"
import Link from 'next/link'
import Image from 'next/image'
import { GoogleAnalytics } from '@next/third-parties/google'
import { envString } from "@/lib/utils/env"
import NonCorporateUserWarning from "@/components/non-corporate-user-warning"
import { Suspense } from "react"

export default async function RootLayoutWithTheme({
  children, theme
}: {
  children: React.ReactNode;
  theme: 'light' | 'dark';
}) {
  return (
    <html lang="pt-BR" data-theme={theme}>
      <body suppressHydrationWarning={true} className={theme === 'dark' ? 'bg-dark text-light' : 'bg-light text-dark'}>
        <ImportBsJS />
        <Navbar
          bg={theme}
          variant={theme === 'dark' ? 'dark' : 'light'}
          data-bs-theme={theme}
          expand="lg"
          style={{ borderBottom: `1px solid ${theme === 'dark' ? 'rgb(60,60,60)' : 'rgb(200,200,200)'}` }}
        >
          <Container fluid={false}>
            <div className="navbar-brand pt-0 pb-0" style={{ overflow: "hidden" }}>
              <Link href="/" className="ms-0 me-0" style={{ verticalAlign: "middle" }}>
                <Image src="/apoia-logo-vertical-transp.png" width={48 * 1102 / 478} height={48} alt="Apoia Logo" className="me-0" style={{}} />
              </Link>
            </div>
            <button className="navbar-toggler d-print-none" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
              <span className="navbar-toggler-icon"></span>
            </button>
            <Suspense fallback={null}><UserMenu /></Suspense>
          </Container>
        </Navbar>
        <Suspense fallback={null}><NonCorporateUserWarning /></Suspense>
        <NextAuthProvider>
          <div className="content">
            {children}
          </div>
        </NextAuthProvider>
        {envString('GOOGLE_ANALYTICS_ID') && <GoogleAnalytics gaId={envString('GOOGLE_ANALYTICS_ID')} />}
      </body>
    </html>
  );
}
