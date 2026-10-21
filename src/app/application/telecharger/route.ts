// Redirection vers le fichier .apk de l'application des parents.
// Le fichier est dans la dernière release du dépôt public GitHub
// « developsteg/mrs-ilhem-apk » : son adresse est permanente, sans signature ni
// expiration, donc elle fonctionne depuis Facebook, Messenger, WhatsApp ou
// n'importe quel navigateur.
//
// Nouvelle version de l'application : après le build EAS, sur GitHub,
// Releases > Edit > remplacer le fichier « learn-english-mrs-ilhem.apk » (même nom, même adresse).
import { NextResponse } from "next/server";

const LIEN_APK = "https://github.com/developsteg/mrs-ilhem-apk/releases/latest/download/learn-english-mrs-ilhem.apk";

// Pas de mise en cache de la redirection elle-même.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.redirect(LIEN_APK, {
    status: 307,
    headers: { "Cache-Control": "no-store" },
  });
}
