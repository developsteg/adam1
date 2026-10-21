// Client Supabase utilisé dans le navigateur (composants "use client").
// Les valeurs viennent du fichier .env.local (jamais écrites dans le code).
import { createBrowserClient } from "@supabase/ssr";

export function creerClientSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
