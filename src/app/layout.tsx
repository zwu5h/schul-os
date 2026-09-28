import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "School OS · Dein Raum zum Lernen",
  description:
    "Dein Schulalltag. Ein Workspace. Notizen, Canvas, Aufgaben und KI.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafbf9" },
    { media: "(prefers-color-scheme: dark)", color: "#161a17" },
  ],
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
