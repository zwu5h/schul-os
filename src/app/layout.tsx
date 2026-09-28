import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "School OS · Dein Raum zum Lernen",
  description:
    "Dein Schulalltag. Ein Workspace. Notizen, Canvas, Aufgaben und KI.",
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
