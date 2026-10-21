// Tableau de bord : chiffres clés du jour et du mois + revenus des 12 derniers mois.
import Link from "next/link";
import { Carte, EnTetePage } from "@/components/ui";
import GraphiqueRevenus from "@/components/GraphiqueRevenus";
import { formaterMontant, nomMois } from "@/lib/format";
import { creerClientServeur } from "@/lib/supabase/server";

// Date du jour en Tunisie ("2026-09-24"), quel que soit le fuseau du serveur
function aujourdhuiTunisie() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Africa/Tunis" });
}

// Les 12 derniers mois, du plus ancien au mois en cours : ["2025-10-01", ..., "2026-09-01"]
function douzeDerniersMois(aujourdhui: string) {
  const [annee, mois] = aujourdhui.split("-").map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(annee, mois - 1 - (11 - i), 1));
    return d.toISOString().slice(0, 10);
  });
}

export default async function PageTableauDeBord() {
  const supabase = await creerClientServeur();
  const aujourdhui = aujourdhuiTunisie();
  const listeMois = douzeDerniersMois(aujourdhui);
  const moisEnCours = listeMois[11];

  // "head: true" : on demande seulement le nombre de lignes, pas les données
  const [eleves, classes, absencesDuJour, paiements] = await Promise.all([
    supabase.from("eleves").select("*", { count: "exact", head: true }),
    supabase.from("classes").select("*", { count: "exact", head: true }),
    supabase
      .from("presences")
      .select("id, seances!inner(date_seance)", { count: "exact", head: true })
      .eq("statut", "absent")
      .eq("seances.date_seance", aujourdhui),
    supabase.from("paiements").select("mois, montant").gte("mois", listeMois[0]),
  ]);

  // Total encaissé pour chaque mois
  const revenus = listeMois.map((mois) => ({
    mois,
    total: (paiements.data ?? []).filter((p) => p.mois === mois).reduce((s, p) => s + Number(p.montant), 0),
  }));
  const totalDuMois = revenus[11].total;
  const totalAnnee = revenus.reduce((s, r) => s + r.total, 0);

  const chiffres = [
    { label: `Encaissé en ${nomMois(moisEnCours)}`, valeur: formaterMontant(totalDuMois), lien: "/paiements" },
    { label: "Élèves", valeur: String(eleves.count ?? 0), lien: "/eleves" },
    {
      label: "Absences aujourd'hui",
      valeur: String(absencesDuJour.count ?? 0),
      lien: "/absences",
      accent: (absencesDuJour.count ?? 0) > 0 ? "text-red-600" : undefined,
    },
    { label: "Classes", valeur: String(classes.count ?? 0), lien: "/classes" },
  ];

  return (
    <>
      <EnTetePage titre="Tableau de bord" description="Vue d'ensemble de vos cours de soutien" />

      <div className="grid grid-cols-4 gap-4">
        {chiffres.map((c) => (
          <Link
            key={c.label}
            href={c.lien}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300"
          >
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className={`mt-2 text-2xl font-bold tabular-nums ${c.accent ?? "text-slate-900"}`}>{c.valeur}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <Carte
          titre="Revenus mensuels"
          actions={<span className="text-sm text-slate-500">12 derniers mois : {formaterMontant(totalAnnee)}</span>}
        >
          <GraphiqueRevenus donnees={revenus} />
        </Carte>
      </div>

      {eleves.count === 0 && (
        <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 p-5 text-sm text-indigo-900">
          <p className="font-semibold">Pour commencer :</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              Créez vos niveaux et vos classes dans <Link href="/classes" className="underline">Classes</Link>.
            </li>
            <li>
              Ajoutez vos élèves et le compte de leurs parents dans <Link href="/eleves" className="underline">Élèves</Link>.
            </li>
          </ol>
        </div>
      )}
    </>
  );
}
