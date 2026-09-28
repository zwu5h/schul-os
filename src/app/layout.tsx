import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "School OS · Dein Raum zum Lernen",
  description:
    "Dein Schulalltag. Ein Workspace. Notizen, Canvas, Aufgaben und KI.",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "School OS",
    statusBarStyle: "black-translucent",
    startupImage: [
      {
        url: "/startup-1206x2622.png",
        media:
          "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
    ],
  },
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
