// Espace parents (version web) : types et petites fonctions de mise en forme
// propres aux parents. Les autres (dates, montants...) viennent de lib/format.ts.

export type Enfant = {
  id: string;
  nom: string;
  prenom: string;
  classe_id: string | null;
  classe: { nom: string; niveau: { nom: string } | null } | null;
};

// "5ème – Groupe 1"
export function nomClasse(enfant: Enfant | null) {
  if (!enfant?.classe) return "Sans classe";
  return `${enfant.classe.niveau?.nom ?? ""} – ${enfant.classe.nom}`;
}

export const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

// "14:00:00" -> "14:00"
export const heure = (valeur: string) => valeur.slice(0, 5);

// Date et heure d'un message : "24/09 à 14:05"
export function formaterMoment(date: string) {
  const d = new Date(date);
  const deux = (n: number) => String(n).padStart(2, "0");
  return `${deux(d.getDate())}/${deux(d.getMonth() + 1)} à ${deux(d.getHours())}:${deux(d.getMinutes())}`;
}

// Numéro du jour d'aujourd'hui : 1 = lundi ... 7 = dimanche
export function jourAujourdhui() {
  const j = new Date().getDay(); // 0 = dimanche
  return j === 0 ? 7 : j;
}

// Messages d'erreur de Supabase (inscription) traduits pour le parent
export function messageErreurInscription(message: string) {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "Un compte existe déjà avec cet email. Connectez-vous.";
  }
  if (m.includes("signups not allowed") || m.includes("signup is disabled")) {
    return "Les inscriptions sont fermées pour le moment. Contactez l'enseignante au 96 487 105.";
  }
  if (m.includes("password")) return "Mot de passe trop faible : au moins 8 caractères.";
  if (m.includes("email")) return "Adresse email invalide.";
  if (m.includes("rate limit")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return "Impossible de créer le compte. Vérifiez votre connexion et réessayez.";
}
