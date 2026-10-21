// Client Supabase utilisé côté serveur (layouts et pages "serveur").
// Il lit la session de l'utilisatrice dans les cookies.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function creerClientServeur() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesAEcrire) {
          try {
            cookiesAEcrire.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Appelé depuis une page serveur : sans importance,
            // proxy.ts se charge de rafraîchir la session.
          }
        },
      },
    }
  );
}
