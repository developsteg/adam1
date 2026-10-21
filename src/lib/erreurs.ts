// Transforme les erreurs techniques en messages compréhensibles (en français).
import { FunctionsHttpError } from "@supabase/supabase-js";

type ErreurSupabase = { code?: string; message?: string } | null;

export function messageErreur(erreur: ErreurSupabase): string {
  if (!erreur) return "";
  switch (erreur.code) {
    case "23505":
      return "Cet élément existe déjà (nom en double).";
    case "23503":
      return "Impossible : cet élément est encore utilisé ailleurs (par exemple des classes, des élèves ou des paiements y sont liés).";
    case "23514":
      return "Valeur invalide : vérifiez les informations saisies (par exemple l'heure de fin doit être après l'heure de début).";
    case "42501":
      return "Action non autorisée.";
    default:
      return "Une erreur est survenue : " + (erreur.message ?? "inconnue");
  }
}

// Lit le message d'erreur renvoyé par une Edge Function
export async function messageErreurFonction(erreur: unknown): Promise<string> {
  if (erreur instanceof FunctionsHttpError) {
    try {
      const corps = await erreur.context.json();
      if (corps?.erreur) return corps.erreur;
    } catch {
      // réponse non JSON : on garde le message générique
    }
  }
  return "Impossible de joindre le serveur. Vérifiez votre connexion.";
}
