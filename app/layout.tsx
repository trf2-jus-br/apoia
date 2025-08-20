'use server'

import "bootstrap/dist/css/bootstrap.min.css"
import "./globals.css"
import ImportBsJS from "../components/importBsJS"
import { Navbar, Nav, Container, NavDropdown, NavLink, NavItem } from "react-bootstrap"
import NextAuthProvider from './context/nextAuthProvider'
import UserMenu from "../components/user-menu"
import Link from 'next/link'
import Image from 'next/image'
import '@mdxeditor/editor/style.css'
import { GoogleAnalytics } from '@next/third-parties/google'

// The following import prevents a Font Awesome icon server-side rendering bug,
// where the icons flash from a very large icon down to a properly sized one:
import '@fortawesome/fontawesome-svg-core/styles.css';
// Prevent fontawesome from adding its CSS since we did it manually above:
import { config } from '@fortawesome/fontawesome-svg-core';
import { envString } from "@/lib/utils/env"
import NonCorporateUserWarning from "@/components/non-corporate-user-warning"
import { Suspense } from "react"
config.autoAddCss = false; /* eslint-disable import/first */


export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt-BR">
            <head>
                <meta property="og:title" content="Apoia" />
                <meta property="og:description" content="Apoia" />
                <meta property="og:url" content="https://apoia.vercel.app" />
                <meta property="og:image" content="https://apoia.vercel.app/apoia-logo-transp.png" />
            </head>
            <body suppressHydrationWarning={true}>
                <ImportBsJS />
                <Navbar bg="light" data-bs-theme="light" expand="lg" style={{ borderBottom: "1px solid rgb(200, 200, 200)" }}>
                    <Container fluid={false}>
                        <div className="navbar-brand pt-0 pb-0" style={{ overflow: "hidden" }}>
                            <Link href="/" className="ms-0 me-0" style={{ verticalAlign: "middle" }}>
                                {/* <Image src="/trf2-logo.png" width={34 * 27 / 32} height={34} alt="Apoia Logo" className="me-0" /> */}
                                <Image src="/apoia-logo-vertical-transp.png" width={48 * 1102 / 478} height={48} alt="Apoia Logo" className="me-0" style={{}} />
                            </Link>
                        </div>
                        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
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
