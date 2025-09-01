'use server'

import "bootstrap/dist/css/bootstrap.min.css"
import "../globals.css"
import ImportBsJS from "@/components/importBsJS"
import { Navbar, Nav, Container, NavDropdown, NavLink, NavItem } from "react-bootstrap"
import NextAuthProvider from '../context/nextAuthProvider'
import UserMenu from "@/components/user-menu"
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

import { Metadata, ResolvingMetadata } from 'next';

type Props = {
    params: Promise<{ id: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
    { params, searchParams }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const metadata: Metadata = {
        openGraph: {
            title: 'Apoia',
            description: 'Apoia',
            url: 'https://apoia.pdpj.jus.br',
            images: ['https://apoia.pdpj.jus.br/apoia-logo-transp.png'],
        }
    }
    return metadata;
}

config.autoAddCss = false; /* eslint-disable import/first */

export async function RootLayoutWithTheme({
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



export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <RootLayoutWithTheme theme="light">{children}</RootLayoutWithTheme>;
}
