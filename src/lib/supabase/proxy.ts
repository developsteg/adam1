// Rafraîchit la session Supabase à chaque requête et
// renvoie vers /connexion toute personne non connectée.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function mettreAJourSession(request: NextRequest) {
  let reponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesAEcrire, entetes) {
          cookiesAEcrire.forEach(({ name, value }) => request.cookies.set(name, value));
          reponse = NextResponse.next({ request });
          cookiesAEcrire.forEach(({ name, value, options }) =>
            reponse.cookies.set(name, value, options)
          );
          Object.entries(entetes).forEach(([cle, valeur]) => reponse.headers.set(cle, valeur));
        },
      },
    }
  );

  // getUser() vérifie la session auprès de Supabase (plus sûr que getSession)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const surPageConnexion = request.nextUrl.pathname.startsWith("/connexion");
  // Pages publiques : politique de confidentialité (demandée par le Play Store),
  // page de téléchargement de l'application des parents, manifeste web, et
  // espace parents web (il gère lui-même sa page de connexion ; les données
  // restent protégées par le RLS de la base)
  const surPagePublique = ["/confidentialite", "/application", "/parents", "/manifest.webmanifest"].some((page) =>
    request.nextUrl.pathname.startsWith(page)
  );

  if (!user && !surPageConnexion && !surPagePublique) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return reponse;
}
