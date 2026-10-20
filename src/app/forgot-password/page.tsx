import { PasswordResetForm } from "@/components/password-reset-form";
import { isPasswordResetEnabled } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return <PasswordResetForm mode="request" enabled={isPasswordResetEnabled()} />;
}
