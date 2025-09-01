import { generateMetadata, RootLayoutWithTheme } from "../(main)/layout";

export { generateMetadata };

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <RootLayoutWithTheme theme="dark">{children}</RootLayoutWithTheme>;
}
