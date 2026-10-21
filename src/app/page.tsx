// L'adresse "/" renvoie directement vers le tableau de bord.
// (Si l'utilisatrice n'est pas connectée, proxy.ts la renvoie vers /connexion.)
import { redirect } from "next/navigation";

export default function Accueil() {
  redirect("/tableau-de-bord");
}
