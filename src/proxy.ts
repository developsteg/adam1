// Exécuté par Next.js avant chaque page (équivalent de l'ancien "middleware").
import { type NextRequest } from "next/server";
import { mettreAJourSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return mettreAJourSession(request);
}

export const config = {
  // Toutes les pages, sauf les fichiers statiques et les images
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
