"use client";
// Page "Paiements" : enregistrer les paiements, générer les reçus PDF
// (enregistrés dans le Storage pour les parents) et voir qui n'a pas payé.
import { useCallback, useEffect, useMemo, useState } from "react";
import { creerClientSupabase } from "@/lib/supabase/client";
import { messageErreur } from "@/lib/erreurs";
import { aujourdhui, formaterDate, formaterMontant, moisActuel, nomMois } from "@/lib/format";
import { genererRecuPdf } from "@/lib/recu";
import type { Classe, Eleve, Niveau, Paiement, Profil } from "@/lib/types";
import { Alerte, Bouton, Carte, Champ, EnTetePage, Liste } from "@/components/ui";

// Raccourci vers le client Supabase du navigateur
const db = creerClientSupabase;

const MODES: Record<string, string> = { especes: "Espèces", virement: "Virement", cheque: "Chèque" };

export default function PagePaiements() {
  const [mois, setMois] = useState(moisActuel()); // "2026-09"
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const [parents, setParents] = useState<Profil[]>([]);
  const [nomEnseignante, setNomEnseignante] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [elevePreselectionne, setElevePreselectionne] = useState("");

  // Données fixes (élèves, classes, parents, nom de l'enseignante)
  useEffect(() => {
    async function chargerReferences() {
      const [resUtilisateur, resEleves, resClasses, resNiveaux, resParents] = await Promise.all([
        db().auth.getUser(),
        db().from("eleves").select("*").order("nom").order("prenom"),
        db().from("classes").select("*").order("nom"),
        db().from("niveaux").select("*").order("ordre").order("nom"),
        db().from("profiles").select("*").eq("role", "parent"),
      ]);
      const monId = resUtilisateur.data.user?.id;
      if (monId) {
        const { data: moi } = await db().from("profiles").select("nom").eq("id", monId).single();
        setNomEnseignante(moi?.nom || "Mrs Ilhem");
      }
      setEleves(resEleves.data ?? []);
      setClasses(resClasses.data ?? []);
      setNiveaux(resNiveaux.data ?? []);
      setParents(resParents.data ?? []);
    }
    chargerReferences();
  }, []);

  // Paiements du mois choisi
  const chargerPaiements = useCallback(async () => {
    const { data, error } = await db()
      .from("paiements")
      .select("*")
      .eq("mois", `${mois}-01`)
      .order("created_at", { ascending: false });
    if (error) setErreur(messageErreur(error));
    setPaiements(data ?? []);
    setChargement(false);
  }, [mois]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    chargerPaiements();
  }, [chargerPaiements]);

  const nomEleve = useCallback(
    (id: string) => {
      const e = eleves.find((el) => el.id === id);
      return e ? `${e.prenom} ${e.nom}` : "?";
    },
    [eleves]
  );
  const nomClasse = useCallback(
    (classeId: string | null) => {
      const classe = classes.find((c) => c.id === classeId);
      const niveau = niveaux.find((n) => n.id === classe?.niveau_id);
      return classe ? `${niveau?.nom ?? "?"} – ${classe.nom}` : "Sans classe";
    },
    [classes, niveaux]
  );

  // Élèves qui n'ont encore rien payé pour ce mois
  const nonPayes = useMemo(() => {
    const payes = new Set(paiements.map((p) => p.eleve_id));
    return eleves.filter((e) => !payes.has(e.id));
  }, [eleves, paiements]);

  const total = paiements.reduce((somme, p) => somme + Number(p.montant), 0);

  // Crée le reçu PDF d'un paiement, l'enregistre dans le Storage et retient son chemin
  const creerRecu = useCallback(
    async (paiement: Paiement) => {
      const eleve = eleves.find((e) => e.id === paiement.eleve_id);
      const parent = parents.find((p) => p.id === eleve?.parent_id);
      // Logo affiché en haut du reçu (fichier public/logo-recu.jpg)
      const logo = await fetch("/logo-recu.jpg")
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null);
      const pdf = await genererRecuPdf({
        logo: logo ? new Uint8Array(logo) : undefined,
        numero: paiement.numero_recu,
        enseignante: nomEnseignante || "Mrs Ilhem",
        eleve: nomEleve(paiement.eleve_id),
        classe: nomClasse(eleve?.classe_id ?? null),
        parent: parent?.nom || "—",
        mois: nomMois(paiement.mois),
        montant: formaterMontant(paiement.montant),
        mode: MODES[paiement.mode] ?? paiement.mode,
        datePaiement: formaterDate(paiement.date_paiement),
      });

      // Dossier "recus/<élève>/" : le parent de l'élève (et lui seul) peut le lire
      const chemin = `recus/${paiement.eleve_id}/${paiement.numero_recu}.pdf`;
      const { error: erreurEnvoi } = await db()
        .storage.from("documents")
        .upload(chemin, new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), {
          contentType: "application/pdf",
          upsert: true,
        });
      if (erreurEnvoi) throw new Error("Envoi du reçu impossible : " + erreurEnvoi.message);

      const { error } = await db().from("paiements").update({ recu_chemin: chemin }).eq("id", paiement.id);
      if (error) throw new Error(messageErreur(error));
      return chemin;
    },
    [eleves, parents, nomEnseignante, nomEleve, nomClasse]
  );

  // Ouvre un reçu avec un lien signé (valable 60 secondes)
  async function ouvrirRecu(paiement: Paiement) {
    setErreur("");
    try {
      const chemin = paiement.recu_chemin ?? (await creerRecu(paiement)); // recrée le reçu s'il manque
      const { data, error } = await db().storage.from("documents").createSignedUrl(chemin, 60);
      if (error || !data) throw new Error("Impossible d'ouvrir le reçu.");
      window.open(data.signedUrl, "_blank", "noopener");
      if (!paiement.recu_chemin) chargerPaiements();
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  async function supprimer(paiement: Paiement) {
    if (
      !confirm(
        `Supprimer le paiement ${paiement.numero_recu} de ${nomEleve(paiement.eleve_id)} (${formaterMontant(paiement.montant)}) ?\nLe reçu sera aussi supprimé.`
      )
    )
      return;
    setErreur("");
    if (paiement.recu_chemin) await db().storage.from("documents").remove([paiement.recu_chemin]);
    const { error } = await db().from("paiements").delete().eq("id", paiement.id);
    if (error) setErreur(messageErreur(error));
    chargerPaiements();
  }

  if (chargement) return <p className="text-slate-500">Chargement...</p>;

  return (
    <>
      <div className="flex items-start justify-between">
        <EnTetePage titre="Paiements" description="Enregistrez les paiements : un reçu PDF est créé automatiquement pour le parent." />
        <div className="w-48">
          <Champ label="Mois" type="month" value={mois} onChange={(e) => e.target.value && setMois(e.target.value)} />
        </div>
      </div>

      <div className="space-y-6">
        {/* ---------- Chiffres du mois ---------- */}
        <div className="grid grid-cols-3 gap-4">
          <Chiffre libelle={`Encaissé en ${nomMois(mois)}`} valeur={formaterMontant(total)} />
          <Chiffre libelle="Paiements enregistrés" valeur={String(paiements.length)} />
          <Chiffre
            libelle="Élèves sans paiement ce mois"
            valeur={String(nonPayes.length)}
            accent={nonPayes.length > 0 ? "text-amber-600" : "text-emerald-600"}
          />
        </div>

        {erreur && <Alerte type="erreur">{erreur}</Alerte>}
        {succes && <Alerte type="succes">{succes}</Alerte>}

        <div className="grid grid-cols-[1.3fr_1fr] items-start gap-6">
          <FormulairePaiement
            key={`${mois}-${elevePreselectionne}`}
            eleves={eleves}
            nomClasse={nomClasse}
            mois={mois}
            elevePreselectionne={elevePreselectionne}
            onEnregistre={async (paiement) => {
              setErreur("");
              setSucces("");
              try {
                await creerRecu(paiement);
                setSucces(`Paiement enregistré. Reçu ${paiement.numero_recu} créé : le parent le retrouvera dans l'application.`);
              } catch (e) {
                setErreur(`Paiement enregistré, mais ${(e as Error).message} Cliquez sur « Reçu » pour réessayer.`);
              }
              setElevePreselectionne("");
              chargerPaiements();
            }}
          />

          {/* ---------- Élèves qui n'ont pas payé ---------- */}
          <Carte titre={`Pas encore payé – ${nomMois(mois)}`}>
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {nonPayes.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    <span className="text-sm font-medium text-slate-800">
                      {e.prenom} {e.nom}
                    </span>
                    <span className="block text-xs text-slate-400">{nomClasse(e.classe_id)}</span>
                  </span>
                  <button onClick={() => setElevePreselectionne(e.id)} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                    Encaisser →
                  </button>
                </li>
              ))}
              {nonPayes.length === 0 && <li className="py-2 text-sm text-emerald-700">✓ Tous les élèves ont payé ce mois.</li>}
            </ul>
          </Carte>
        </div>

        {/* ---------- Paiements du mois ---------- */}
        <Carte titre={`Paiements de ${nomMois(mois)}`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 font-medium">N° reçu</th>
                <th className="py-2 font-medium">Élève</th>
                <th className="py-2 text-right font-medium">Montant</th>
                <th className="py-2 pl-6 font-medium">Mode</th>
                <th className="py-2 font-medium">Payé le</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paiements.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-3 font-mono text-slate-600">{p.numero_recu}</td>
                  <td className="py-3 font-medium text-slate-800">{nomEleve(p.eleve_id)}</td>
                  <td className="py-3 text-right font-semibold tabular-nums text-slate-800">{formaterMontant(p.montant)}</td>
                  <td className="py-3 pl-6 text-slate-600">{MODES[p.mode] ?? p.mode}</td>
                  <td className="py-3 text-slate-600">{formaterDate(p.date_paiement)}</td>
                  <td className="py-3 text-right">
                    <span className="inline-flex gap-2">
                      <Bouton variante="secondaire" onClick={() => ouvrirRecu(p)}>
                        Reçu PDF
                      </Bouton>
                      <Bouton variante="danger" onClick={() => supprimer(p)}>
                        Supprimer
                      </Bouton>
                    </span>
                  </td>
                </tr>
              ))}
              {paiements.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Aucun paiement pour ce mois.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Carte>
      </div>
    </>
  );
}

function Chiffre({ libelle, valeur, accent = "text-slate-900" }: { libelle: string; valeur: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{libelle}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${accent}`}>{valeur}</p>
    </div>
  );
}

// =====================================================================
// Formulaire d'enregistrement d'un paiement
// =====================================================================
function FormulairePaiement({
  eleves,
  nomClasse,
  mois,
  elevePreselectionne,
  onEnregistre,
}: {
  eleves: Eleve[];
  nomClasse: (classeId: string | null) => string;
  mois: string;
  elevePreselectionne: string;
  onEnregistre: (paiement: Paiement) => void;
}) {
  const [eleveId, setEleveId] = useState(elevePreselectionne || eleves[0]?.id || "");
  const [moisPaye, setMoisPaye] = useState(mois);
  const [montant, setMontant] = useState("");
  const [mode, setMode] = useState("especes");
  const [datePaiement, setDatePaiement] = useState(aujourdhui());
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    const valeur = Number(montant.replace(",", "."));
    if (!(valeur > 0) || valeur >= 10000) {
      setErreur("Indiquez un montant entre 0 et 10 000 DT.");
      return;
    }
    setEnCours(true);
    setErreur("");
    const { data, error } = await db()
      .from("paiements")
      .insert({ eleve_id: eleveId, mois: `${moisPaye}-01`, montant: valeur, mode, date_paiement: datePaiement })
      .select("*")
      .single();
    setEnCours(false);
    if (error || !data) {
      setErreur(messageErreur(error));
      return;
    }
    setMontant("");
    onEnregistre(data);
  }

  if (eleves.length === 0) {
    return (
      <Carte titre="Enregistrer un paiement">
        <p className="text-sm text-slate-500">Ajoutez d&apos;abord des élèves.</p>
      </Carte>
    );
  }

  return (
    <Carte titre="Enregistrer un paiement">
      <form onSubmit={enregistrer} className="space-y-4">
        {erreur && <Alerte type="erreur">{erreur}</Alerte>}
        <Liste label="Élève" value={eleveId} onChange={(e) => setEleveId(e.target.value)}>
          {eleves.map((el) => (
            <option key={el.id} value={el.id}>
              {el.prenom} {el.nom} ({nomClasse(el.classe_id)})
            </option>
          ))}
        </Liste>
        <div className="grid grid-cols-2 gap-4">
          <Champ label="Mois payé" type="month" required value={moisPaye} onChange={(e) => setMoisPaye(e.target.value)} />
          <Champ
            label="Montant (DT)"
            required
            inputMode="decimal"
            placeholder="ex : 60"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
          />
          <Liste label="Mode" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="especes">Espèces</option>
            <option value="virement">Virement</option>
          </Liste>
          <Champ label="Date du paiement" type="date" required value={datePaiement} onChange={(e) => setDatePaiement(e.target.value)} />
        </div>
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Enregistrement..." : "Enregistrer et créer le reçu"}
        </Bouton>
      </form>
    </Carte>
  );
}
