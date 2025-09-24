import "bootstrap/dist/css/bootstrap.min.css"
import "../globals.css"
import { generateMetadata } from "../(main)/layout";
import RootLayoutWithTheme from "@/components/RootLayoutWithTheme";

export { generateMetadata };

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <RootLayoutWithTheme theme="dark">{children}</RootLayoutWithTheme>;
}
