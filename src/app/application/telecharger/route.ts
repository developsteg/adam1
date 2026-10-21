// Redirection vers le fichier .apk de l'application des parents.
// Le fichier est hébergé sur Vercel Blob (store « app-parents », public) :
// son adresse est permanente, sans signature ni expiration, donc elle
// fonctionne depuis Facebook, Messenger, WhatsApp ou n'importe quel navigateur.
//
// Nouvelle version de l'application : après le build EAS, remplacer le fichier
// (même adresse) depuis le dossier web avec :
//   vercel blob put "<chemin du .apk>" --access public --pathname app.apk --allow-overwrite
// (la nouvelle version peut mettre quelques minutes à remplacer l'ancienne
// dans les caches).
import { NextResponse } from "next/server";

const LIEN_APK = "https://y9w2zu8d426kqput.public.blob.vercel-storage.com/app.apk";

// Pas de mise en cache de la redirection elle-même.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.redirect(LIEN_APK, {
    status: 307,
    headers: { "Cache-Control": "no-store" },
  });
}
