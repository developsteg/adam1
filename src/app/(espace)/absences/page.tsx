"use client";
// Page "Absences" : faire l'appel d'une classe pour une date,
// prévenir les parents des absents, et consulter l'historique d'un élève.
import { useCallback, useEffect, useState } from "react";
import { creerClientSupabase } from "@/lib/supabase/client";
import { messageErreur, messageErreurFonction } from "@/lib/erreurs";
import type { Classe, Eleve, Niveau } from "@/lib/types";
import { Alerte, Bouton, Carte, Champ, EnTetePage, Liste } from "@/components/ui";
import SelecteurClasse from "@/components/SelecteurClasse";

type Statut = "present" | "absent" | "retard";

const STATUTS: { valeur: Statut; label: string; styleActif: string }[] = [
  { valeur: "present", label: "Présent", styleActif: "bg-emerald-600 text-white border-emerald-600" },
  { valeur: "absent", label: "Absent", styleActif: "bg-red-600 text-white border-red-600" },
  { valeur: "retard", label: "Retard", styleActif: "bg-amber-500 text-white border-amber-500" },
];

// Raccourci vers le client Supabase du navigateur
const db = creerClientSupabase;

// Date du jour au format "2026-09-24" (heure locale du PC)
function aujourdhui() {
  return new Date().toLocaleDateString("sv-SE");
}

// "2026-09-24" -> "24/09/2026"
function formaterDate(date: string) {
  const [annee, mois, jour] = date.split("-");
  return `${jour}/${mois}/${annee}`;
}

export default function PageAbsences() {
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [chargement, setChargement] = useState(true);

  const [classeId, setClasseId] = useState("");
  const [date, setDate] = useState(aujourdhui());
  // Augmente à chaque validation de l'appel, pour rafraîchir l'historique
  const [versionHistorique, setVersionHistorique] = useState(0);

  useEffect(() => {
    async function chargerClasses() {
      const [resNiveaux, resClasses] = await Promise.all([
        db().from("niveaux").select("*").order("ordre").order("nom"),
        db().from("classes").select("*").order("nom"),
      ]);
      const listeNiveaux = resNiveaux.data ?? [];
      const listeClasses = resClasses.data ?? [];
      setNiveaux(listeNiveaux);
      setClasses(listeClasses);
      const premiere = listeNiveaux.map((n) => listeClasses.find((c) => c.niveau_id === n.id)).find(Boolean);
      setClasseId(premiere?.id ?? "");
      setChargement(false);
    }
    chargerClasses();
  }, []);

  if (chargement) return <p className="text-slate-500">Chargement...</p>;

  if (classes.length === 0) {
    return (
      <>
        <EnTetePage titre="Absences" />
        <Carte>
          <p className="text-slate-500">Créez d&apos;abord une classe dans la page Classes.</p>
        </Carte>
      </>
    );
  }

  return (
    <>
      <EnTetePage titre="Absences" description="Faites l'appel : les parents des élèves absents sont prévenus sur leur téléphone." />
      <div className="space-y-6">
        <div className="grid grid-cols-[18rem_12rem] gap-4">
          <SelecteurClasse niveaux={niveaux} classes={classes} valeur={classeId} onChange={setClasseId} />
          <Champ label="Date" type="date" required value={date} max={aujourdhui()} onChange={(e) => setDate(e.target.value)} />
        </div>

        {classeId && date && (
          <Appel
            key={`${classeId}-${date}`}
            classeId={classeId}
            date={date}
            onValide={() => setVersionHistorique((v) => v + 1)}
          />
        )}
        {classeId && <Historique key={classeId} classeId={classeId} version={versionHistorique} />}
      </div>
    </>
  );
}

// =====================================================================
// L'appel d'une classe pour une date
// =====================================================================
function Appel({ classeId, date, onValide }: { classeId: string; date: string; onValide: () => void }) {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [statuts, setStatuts] = useState<Record<string, Statut>>({});
  const [dejaValide, setDejaValide] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  const charger = useCallback(async () => {
    // Élèves de la classe + appel déjà enregistré pour cette date (s'il existe)
    const [resEleves, resSeance] = await Promise.all([
      db().from("eleves").select("*").eq("classe_id", classeId).order("nom").order("prenom"),
      db()
        .from("seances")
        .select("id, validee, presences(eleve_id, statut)")
        .eq("classe_id", classeId)
        .eq("date_seance", date)
        .maybeSingle(),
    ]);
    if (resEleves.error || resSeance.error) setErreur(messageErreur(resEleves.error ?? resSeance.error));

    const listeEleves = resEleves.data ?? [];
    const presences = (resSeance.data?.presences ?? []) as { eleve_id: string; statut: Statut }[];

    // Par défaut tout le monde est présent, sauf ce qui a déjà été enregistré
    const initial: Record<string, Statut> = {};
    for (const eleve of listeEleves) {
      initial[eleve.id] = presences.find((p) => p.eleve_id === eleve.id)?.statut ?? "present";
    }
    setEleves(listeEleves);
    setStatuts(initial);
    setDejaValide(resSeance.data?.validee ?? false);
    setChargement(false);
  }, [classeId, date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  async function valider() {
    setEnCours(true);
    setErreur("");
    setSucces("");

    // 1) Crée (ou retrouve) la séance de ce jour pour cette classe
    const { data: seance, error: erreurSeance } = await db()
      .from("seances")
      .upsert({ classe_id: classeId, date_seance: date, validee: true }, { onConflict: "classe_id,date_seance" })
      .select("id")
      .single();
    if (erreurSeance || !seance) {
      setErreur(messageErreur(erreurSeance));
      setEnCours(false);
      return;
    }

    // 2) Enregistre la présence de chaque élève.
    //    Un élève qui n'est plus absent pourra être notifié à nouveau s'il redevient absent.
    const absents = eleves.filter((e) => statuts[e.id] === "absent");
    const autres = eleves.filter((e) => statuts[e.id] !== "absent");
    const lignesAbsents = absents.map((e) => ({ seance_id: seance.id, eleve_id: e.id, statut: "absent" }));
    const lignesAutres = autres.map((e) => ({
      seance_id: seance.id,
      eleve_id: e.id,
      statut: statuts[e.id],
      notification_envoyee: false,
    }));

    for (const lignes of [lignesAbsents, lignesAutres]) {
      if (lignes.length === 0) continue;
      const { error } = await db().from("presences").upsert(lignes, { onConflict: "seance_id,eleve_id" });
      if (error) {
        setErreur(messageErreur(error));
        setEnCours(false);
        return;
      }
    }

    // 3) Notifications aux parents des absents (Edge Function)
    let resume = "Appel enregistré.";
    if (absents.length > 0) {
      const { data, error } = await db().functions.invoke("notifier-absences", { body: { seance_id: seance.id } });
      if (error) {
        resume += " Attention : les notifications n'ont pas pu être envoyées (" + (await messageErreurFonction(error)) + ")";
      } else if (data.envoyees === 0 && data.sans_application === 0) {
        resume += " Les parents des absents avaient déjà été prévenus.";
      } else {
        resume += ` ${data.envoyees} notification${data.envoyees > 1 ? "s" : ""} envoyée${data.envoyees > 1 ? "s" : ""}.`;
        if (data.sans_application > 0) {
          resume += ` ${data.sans_application} parent${data.sans_application > 1 ? "s n'ont" : " n'a"} pas encore installé l'application.`;
        }
      }
    }

    setSucces(resume);
    setDejaValide(true);
    setEnCours(false);
    onValide();
  }

  if (chargement) return <p className="text-slate-500">Chargement...</p>;

  const nbAbsents = eleves.filter((e) => statuts[e.id] === "absent").length;
  const nbRetards = eleves.filter((e) => statuts[e.id] === "retard").length;

  return (
    <Carte
      titre={`Appel du ${formaterDate(date)}`}
      actions={
        dejaValide && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            ✓ Appel déjà validé (modifiable)
          </span>
        )
      }
    >
      {eleves.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun élève dans cette classe.</p>
      ) : (
        <div className="space-y-4">
          {erreur && <Alerte type="erreur">{erreur}</Alerte>}
          {succes && <Alerte type="succes">{succes}</Alerte>}

          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-slate-100">
              {eleves.map((eleve) => (
                <tr key={eleve.id}>
                  <td className="py-2.5 font-medium text-slate-800">
                    {eleve.nom} {eleve.prenom}
                  </td>
                  <td className="py-2.5 text-right">
                    <span className="inline-flex overflow-hidden rounded-lg border border-slate-200">
                      {STATUTS.map((s) => {
                        const actif = statuts[eleve.id] === s.valeur;
                        return (
                          <button
                            key={s.valeur}
                            onClick={() => {
                              setStatuts({ ...statuts, [eleve.id]: s.valeur });
                              setSucces("");
                            }}
                            className={`border-l px-4 py-1.5 text-sm font-medium transition first:border-l-0 ${
                              actif ? s.styleActif : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-600">
              {eleves.length} élève{eleves.length > 1 ? "s" : ""} · <span className="text-red-600">{nbAbsents} absent{nbAbsents > 1 ? "s" : ""}</span> ·{" "}
              <span className="text-amber-600">
                {nbRetards} retard{nbRetards > 1 ? "s" : ""}
              </span>
            </p>
            <Bouton onClick={valider} disabled={enCours}>
              {enCours ? "Validation..." : "Valider l'appel"}
            </Bouton>
          </div>
        </div>
      )}
    </Carte>
  );
}

// =====================================================================
// Historique des absences et retards d'un élève
// =====================================================================
type LigneHistorique = {
  id: string;
  statut: Statut;
  notification_envoyee: boolean;
  seance: { date_seance: string } | null;
};

function Historique({ classeId, version }: { classeId: string; version: number }) {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [eleveId, setEleveId] = useState("");
  const [lignes, setLignes] = useState<LigneHistorique[]>([]);

  useEffect(() => {
    db()
      .from("eleves")
      .select("*")
      .eq("classe_id", classeId)
      .order("nom")
      .order("prenom")
      .then(({ data }) => {
        setEleves(data ?? []);
        setEleveId(data?.[0]?.id ?? "");
      });
  }, [classeId]);

  const charger = useCallback(async () => {
    if (!eleveId) return;
    const { data } = await db()
      .from("presences")
      .select("id, statut, notification_envoyee, seance:seances(date_seance)")
      .eq("eleve_id", eleveId)
      .neq("statut", "present")
      .returns<LigneHistorique[]>();
    // Du plus récent au plus ancien
    const triees = (data ?? []).sort((a, b) => (b.seance?.date_seance ?? "").localeCompare(a.seance?.date_seance ?? ""));
    setLignes(triees);
  }, [eleveId]);

  // Recharge quand l'élève change ou après chaque validation de l'appel
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger, version]);

  if (eleves.length === 0) return null;

  const nbAbsences = lignes.filter((l) => l.statut === "absent").length;
  const nbRetards = lignes.filter((l) => l.statut === "retard").length;

  return (
    <Carte
      titre="Historique par élève"
      actions={
        <Bouton variante="secondaire" onClick={charger}>
          Actualiser
        </Bouton>
      }
    >
      <div className="flex items-end gap-6">
        <div className="w-72">
          <Liste label="Élève" value={eleveId} onChange={(e) => setEleveId(e.target.value)}>
            {eleves.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom} {e.prenom}
              </option>
            ))}
          </Liste>
        </div>
        <p className="pb-2 text-sm text-slate-600">
          <strong className="text-red-600">{nbAbsences}</strong> absence{nbAbsences > 1 ? "s" : ""} ·{" "}
          <strong className="text-amber-600">{nbRetards}</strong> retard{nbRetards > 1 ? "s" : ""}
        </p>
      </div>

      <table className="mt-4 w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-500">
          <tr>
            <th className="py-2 font-medium">Date</th>
            <th className="py-2 font-medium">Statut</th>
            <th className="py-2 font-medium">Parent prévenu</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lignes.map((l) => (
            <tr key={l.id}>
              <td className="py-2.5 text-slate-800">{l.seance ? formaterDate(l.seance.date_seance) : "—"}</td>
              <td className="py-2.5">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    l.statut === "absent" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {l.statut === "absent" ? "Absent" : "Retard"}
                </span>
              </td>
              <td className="py-2.5 text-slate-600">
                {l.statut === "absent" ? (l.notification_envoyee ? "Oui" : "Non") : "—"}
              </td>
            </tr>
          ))}
          {lignes.length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-center text-slate-500">
                Aucune absence ni retard. Bravo !
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Carte>
  );
}
