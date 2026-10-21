// Petites fonctions de mise en forme (dates, mois, montants) en français.

const NOMS_MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// "2026-10-01" ou "2026-10" -> "Octobre 2026"
export function nomMois(date: string) {
  const [annee, mois] = date.split("-");
  return `${NOMS_MOIS[Number(mois) - 1]} ${annee}`;
}

// "2026-10-01" -> "Oct." (pour les petits espaces)
export function nomMoisCourt(date: string) {
  const mois = NOMS_MOIS[Number(date.split("-")[1]) - 1];
  return mois.length > 4 ? mois.slice(0, 3) + "." : mois;
}

// "2026-10-03" -> "03/10/2026"
export function formaterDate(date: string) {
  const [annee, mois, jour] = date.split("-");
  return `${jour}/${mois}/${annee}`;
}

// 1250.5 -> "1 250,500 DT" (le dinar a 3 décimales : les millimes)
export function formaterMontant(montant: number) {
  return (
    Number(montant).toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + " DT"
  );
}

// Mois en cours au format "2026-09" (heure locale)
export function moisActuel() {
  return new Date().toLocaleDateString("sv-SE").slice(0, 7);
}

// Date du jour au format "2026-09-24" (heure locale)
export function aujourdhui() {
  return new Date().toLocaleDateString("sv-SE");
}
