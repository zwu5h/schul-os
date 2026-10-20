import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

function publicKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isCloudEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && publicKey(),
  );
}

export function getSupabase(): SupabaseClient | null {
  if (!isCloudEnabled()) return null;
  if (client === undefined) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      publicKey()!,
    );
  }
  return client;
}
