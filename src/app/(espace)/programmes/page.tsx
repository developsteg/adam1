"use client";
// Page "Programmes" : les leçons prévues pour chaque classe,
// avec leur statut (prévu / fait).
import { useCallback, useEffect, useState } from "react";
import { creerClientSupabase } from "@/lib/supabase/client";
import { messageErreur } from "@/lib/erreurs";
import type { Classe, Niveau, Programme } from "@/lib/types";
import { Alerte, Bouton, Carte, Champ, EnTetePage, Liste, styleChamp } from "@/components/ui";
import SelecteurClasse from "@/components/SelecteurClasse";

// Raccourci vers le client Supabase du navigateur
const db = creerClientSupabase;

// "2026-10-15" -> "15/10/2026"
function formaterDate(date: string | null) {
  if (!date) return "—";
  const [annee, mois, jour] = date.split("-");
  return `${jour}/${mois}/${annee}`;
}

export default function PageProgrammes() {
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  // Filtres
  const [classeId, setClasseId] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<"" | "prevu" | "fait">("");

  // Formulaire : null = fermé, "nouveau" = ajout, sinon la leçon à modifier
  const [formulaire, setFormulaire] = useState<null | "nouveau" | Programme>(null);

  const charger = useCallback(async () => {
    const [resNiveaux, resClasses, resProgrammes] = await Promise.all([
      db().from("niveaux").select("*").order("ordre").order("nom"),
      db().from("classes").select("*").order("nom"),
      db().from("programmes").select("*").order("date_prevue", { nullsFirst: false }).order("created_at"),
    ]);
    const premiereErreur = resNiveaux.error ?? resClasses.error ?? resProgrammes.error;
    if (premiereErreur) setErreur(messageErreur(premiereErreur));
    setNiveaux(resNiveaux.data ?? []);
    setClasses(resClasses.data ?? []);
    setProgrammes(resProgrammes.data ?? []);
    setChargement(false);
  }, []);

  useEffect(() => {
    // Chargement initial des données depuis Supabase
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  // Nom complet d'une classe, ex : "5ème – Groupe 1"
  function nomClasse(id: string) {
    const classe = classes.find((c) => c.id === id);
    const niveau = niveaux.find((n) => n.id === classe?.niveau_id);
    return classe ? `${niveau?.nom ?? "?"} – ${classe.nom}` : "?";
  }

  async function changerStatut(programme: Programme) {
    setErreur("");
    const nouveau = programme.statut === "fait" ? "prevu" : "fait";
    // Mise à jour immédiate de l'affichage, puis enregistrement
    setProgrammes((liste) => liste.map((p) => (p.id === programme.id ? { ...p, statut: nouveau } : p)));
    const { error } = await db().from("programmes").update({ statut: nouveau }).eq("id", programme.id);
    if (error) {
      setErreur(messageErreur(error));
      charger();
    }
  }

  async function supprimer(programme: Programme) {
    if (!confirm(`Supprimer la leçon « ${programme.titre} » ?`)) return;
    setErreur("");
    const { error } = await db().from("programmes").delete().eq("id", programme.id);
    if (error) setErreur(messageErreur(error));
    charger();
  }

  if (chargement) return <p className="text-slate-500">Chargement...</p>;

  if (classes.length === 0) {
    return (
      <>
        <EnTetePage titre="Programmes" />
        <Carte>
          <p className="text-slate-500">Créez d&apos;abord une classe dans la page Classes.</p>
        </Carte>
      </>
    );
  }

  // Leçons de la classe choisie (ou de toutes les classes)
  const deLaClasse = classeId ? programmes.filter((p) => p.classe_id === classeId) : programmes;
  const affiches = filtreStatut ? deLaClasse.filter((p) => p.statut === filtreStatut) : deLaClasse;
  const nbFaits = deLaClasse.filter((p) => p.statut === "fait").length;
  const pourcentage = deLaClasse.length ? Math.round((nbFaits / deLaClasse.length) * 100) : 0;

  return (
    <>
      <div className="flex items-start justify-between">
        <EnTetePage titre="Programmes" description="Les leçons prévues pour chaque classe." />
        {!formulaire && <Bouton onClick={() => setFormulaire("nouveau")}>+ Ajouter une leçon</Bouton>}
      </div>

      <div className="space-y-4">
        {erreur && <Alerte type="erreur">{erreur}</Alerte>}

        {formulaire && (
          <FormulaireProgramme
            key={formulaire === "nouveau" ? "nouveau" : formulaire.id}
            programme={formulaire === "nouveau" ? null : formulaire}
            niveaux={niveaux}
            classes={classes}
            classeParDefaut={classeId || classes[0].id}
            onFermer={() => setFormulaire(null)}
            onEnregistre={() => {
              setFormulaire(null);
              charger();
            }}
          />
        )}

        <Carte>
          {/* ---------- Filtres + avancement ---------- */}
          <div className="grid grid-cols-3 items-end gap-4">
            <SelecteurClasse
              niveaux={niveaux}
              classes={classes}
              valeur={classeId}
              onChange={setClasseId}
              optionVide="Toutes les classes"
            />
            <Liste
              label="Statut"
              value={filtreStatut}
              onChange={(e) => setFiltreStatut(e.target.value as "" | "prevu" | "fait")}
            >
              <option value="">Tous</option>
              <option value="prevu">Prévu</option>
              <option value="fait">Fait</option>
            </Liste>
            <div>
              <p className="mb-1 text-sm text-slate-600">
                Avancement : <strong>{nbFaits}</strong> / {deLaClasse.length} leçon{deLaClasse.length > 1 ? "s" : ""} ({pourcentage} %)
              </p>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pourcentage}%` }} />
              </div>
            </div>
          </div>

          {/* ---------- Tableau des leçons ---------- */}
          <table className="mt-6 w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="w-28 py-2 font-medium">Statut</th>
                <th className="w-28 py-2 font-medium">Date prévue</th>
                <th className="py-2 font-medium">Leçon</th>
                {!classeId && <th className="py-2 font-medium">Classe</th>}
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {affiches.map((p) => (
                <tr key={p.id} className="align-top hover:bg-slate-50">
                  <td className="py-3">
                    <button
                      onClick={() => changerStatut(p)}
                      title="Cliquer pour changer le statut"
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        p.statut === "fait"
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      }`}
                    >
                      {p.statut === "fait" ? "✓ Fait" : "Prévu"}
                    </button>
                  </td>
                  <td className="py-3 text-slate-600">{formaterDate(p.date_prevue)}</td>
                  <td className="py-3">
                    <p className={`font-medium ${p.statut === "fait" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                      {p.titre}
                    </p>
                    {p.description && <p className="mt-0.5 whitespace-pre-line text-slate-500">{p.description}</p>}
                  </td>
                  {!classeId && <td className="py-3 text-slate-600">{nomClasse(p.classe_id)}</td>}
                  <td className="py-3 text-right">
                    <span className="inline-flex gap-2">
                      <Bouton variante="secondaire" onClick={() => setFormulaire(p)}>
                        Modifier
                      </Bouton>
                      <Bouton variante="danger" onClick={() => supprimer(p)}>
                        Supprimer
                      </Bouton>
                    </span>
                  </td>
                </tr>
              ))}
              {affiches.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    Aucune leçon pour le moment.
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

// =====================================================================
// Formulaire d'ajout / de modification d'une leçon
// =====================================================================
function FormulaireProgramme({
  programme,
  niveaux,
  classes,
  classeParDefaut,
  onFermer,
  onEnregistre,
}: {
  programme: Programme | null; // null = nouvelle leçon
  niveaux: Niveau[];
  classes: Classe[];
  classeParDefaut: string;
  onFermer: () => void;
  onEnregistre: () => void;
}) {
  const [classeId, setClasseId] = useState(programme?.classe_id ?? classeParDefaut);
  const [titre, setTitre] = useState(programme?.titre ?? "");
  const [datePrevue, setDatePrevue] = useState(programme?.date_prevue ?? "");
  const [description, setDescription] = useState(programme?.description ?? "");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur("");
    const donnees = {
      classe_id: classeId,
      titre: titre.trim(),
      date_prevue: datePrevue || null,
      description: description.trim() || null,
    };
    const { error } = programme
      ? await db().from("programmes").update(donnees).eq("id", programme.id)
      : await db().from("programmes").insert(donnees);
    setEnCours(false);
    if (error) {
      setErreur(messageErreur(error));
      return;
    }
    onEnregistre();
  }

  return (
    <Carte titre={programme ? "Modifier la leçon" : "Nouvelle leçon"}>
      <form onSubmit={enregistrer} className="space-y-4">
        {erreur && <Alerte type="erreur">{erreur}</Alerte>}
        <div className="grid grid-cols-[1fr_2fr_1fr] gap-4">
          <SelecteurClasse niveaux={niveaux} classes={classes} valeur={classeId} onChange={setClasseId} />
          <Champ
            label="Titre de la leçon"
            required
            maxLength={150}
            placeholder="ex : Unit 3 – My family"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
          />
          <Champ label="Date prévue" type="date" value={datePrevue} onChange={(e) => setDatePrevue(e.target.value)} />
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Description (facultatif)</span>
          <textarea
            className={styleChamp}
            rows={3}
            maxLength={2000}
            placeholder="Objectifs, exercices, pages du livre..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="flex gap-2">
          <Bouton type="submit" disabled={enCours}>
            {enCours ? "Enregistrement..." : "Enregistrer"}
          </Bouton>
          <Bouton type="button" variante="secondaire" onClick={onFermer}>
            Annuler
          </Bouton>
        </div>
      </form>
    </Carte>
  );
}
