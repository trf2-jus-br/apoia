
'use server'

import "bootstrap/dist/css/bootstrap.min.css"
import "../globals.css"
import '@mdxeditor/editor/style.css'
// (GoogleAnalytics used inside RootLayoutWithTheme)

// The following import prevents a Font Awesome icon server-side rendering bug,
// where the icons flash from a very large icon down to a properly sized one:
import '@fortawesome/fontawesome-svg-core/styles.css';
// Prevent fontawesome from adding its CSS since we did it manually above:
import { config } from '@fortawesome/fontawesome-svg-core';
import RootLayoutWithTheme from "@/components/RootLayoutWithTheme"

import { Metadata, ResolvingMetadata } from 'next';

type LayoutGenerateMetadataProps = {
    params: Promise<any>
}

export async function generateMetadata(
    { params }: LayoutGenerateMetadataProps,
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



export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <RootLayoutWithTheme theme="light">{children}</RootLayoutWithTheme>;
}
