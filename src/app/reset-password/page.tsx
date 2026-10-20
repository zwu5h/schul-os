import type { Metadata } from "next";
import { PasswordResetForm } from "@/components/password-reset-form";

export const metadata: Metadata = {
  title: "Passwort zurücksetzen · School OS",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" && !params.error ? params.token : undefined;
  return <PasswordResetForm mode="reset" token={token} />;
}
