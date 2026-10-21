"use client";
// Page "Emploi du temps" : grille de la semaine pour une classe,
// avec ajout, modification et suppression des créneaux.
// Après un changement (ou pour un rattrapage / une annulation), l'enseignante
// peut prévenir les parents : message à la classe + notification sur leur téléphone.
import { useCallback, useEffect, useState } from "react";
import { creerClientSupabase } from "@/lib/supabase/client";
import { messageErreur } from "@/lib/erreurs";
import type { Classe, Creneau, Niveau } from "@/lib/types";
import { Alerte, Bouton, Carte, Champ, EnTetePage, Liste } from "@/components/ui";
import SelecteurClasse from "@/components/SelecteurClasse";
import PrevenirParents from "@/components/PrevenirParents";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

// Raccourci vers le client Supabase du navigateur
const db = creerClientSupabase;

// "14:00:00" -> "14:00"
const heure = (valeur: string) => valeur.slice(0, 5);

export default function PageEmploiDuTemps() {
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [classeId, setClasseId] = useState("");
  const [creneaux, setCreneaux] = useState<Creneau[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  // Formulaire : null = fermé, "nouveau" = ajout (avec le jour cliqué), sinon le créneau à modifier
  const [formulaire, setFormulaire] = useState<null | { jour: number } | Creneau>(null);

  // Formulaire "Prévenir les parents" : null = fermé, sinon le texte proposé
  const [annonce, setAnnonce] = useState<null | { details: string }>(null);

  // 1) Chargement des niveaux et classes
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
      // Sélectionne automatiquement la première classe (dans l'ordre des niveaux)
      const premiere = listeNiveaux
        .map((n) => listeClasses.find((c) => c.niveau_id === n.id))
        .find(Boolean);
      setClasseId(premiere?.id ?? "");
      setChargement(false);
    }
    chargerClasses();
  }, []);

  // 2) Chargement des créneaux de la classe choisie
  const chargerCreneaux = useCallback(async () => {
    if (!classeId) return;
    const { data, error } = await db()
      .from("emplois_du_temps")
      .select("*")
      .eq("classe_id", classeId)
      .order("heure_debut");
    if (error) setErreur(messageErreur(error));
    setCreneaux(data ?? []);
  }, [classeId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    chargerCreneaux();
  }, [chargerCreneaux]);

  // Nom complet de la classe choisie, ex : "1ère année – Groupe A"
  const classeChoisie = classes.find((c) => c.id === classeId);
  const nomClasseChoisie = classeChoisie
    ? `${niveaux.find((n) => n.id === classeChoisie.niveau_id)?.nom ?? "?"} – ${classeChoisie.nom}`
    : "";

  if (chargement) return <p className="text-slate-500">Chargement...</p>;

  if (classes.length === 0) {
    return (
      <>
        <EnTetePage titre="Emploi du temps" />
        <Carte>
          <p className="text-slate-500">Créez d&apos;abord une classe dans la page Classes.</p>
        </Carte>
      </>
    );
  }

  return (
    <>
      <EnTetePage titre="Emploi du temps" description="Les créneaux de la semaine pour chaque classe." />

      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="w-72">
            <SelecteurClasse
              niveaux={niveaux}
              classes={classes}
              valeur={classeId}
              onChange={(id) => {
                setClasseId(id);
                setFormulaire(null);
                setAnnonce(null);
                setErreur("");
              }}
            />
          </div>
          <div className="flex gap-2">
            {!annonce && (
              <Bouton variante="secondaire" onClick={() => setAnnonce({ details: "" })}>
                📢 Prévenir les parents
              </Bouton>
            )}
            {!formulaire && <Bouton onClick={() => setFormulaire({ jour: 1 })}>+ Ajouter un créneau</Bouton>}
          </div>
        </div>

        {erreur && <Alerte type="erreur">{erreur}</Alerte>}

        {formulaire && (
          <FormulaireCreneau
            key={"id" in formulaire ? formulaire.id : `nouveau-${formulaire.jour}`}
            classeId={classeId}
            creneau={"id" in formulaire ? formulaire : null}
            jourParDefaut={formulaire.jour}
            creneauxExistants={creneaux}
            onFermer={() => setFormulaire(null)}
            onEnregistre={(description) => {
              setFormulaire(null);
              chargerCreneaux();
              // Propose tout de suite de prévenir les parents du changement
              setAnnonce({ details: description });
            }}
          />
        )}

        {annonce && classeId && (
          <PrevenirParents
            key={annonce.details}
            classeId={classeId}
            nomClasse={nomClasseChoisie}
            detailsInitiaux={annonce.details}
            onFermer={() => setAnnonce(null)}
          />
        )}

        {/* ---------- Grille de la semaine ---------- */}
        <div className="grid grid-cols-7 gap-3">
          {JOURS.map((nomJour, index) => {
            const jour = index + 1;
            const duJour = creneaux.filter((c) => c.jour === jour);
            return (
              <div key={jour} className="flex min-h-72 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-700">
                  {nomJour}
                </div>
                <div className="flex-1 space-y-2 p-2">
                  {duJour.map((creneau) => (
                    <button
                      key={creneau.id}
                      onClick={() => setFormulaire(creneau)}
                      title="Cliquer pour modifier"
                      className="block w-full rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-2 text-left transition hover:border-indigo-300"
                    >
                      <p className="text-xs font-medium text-indigo-700">
                        {heure(creneau.heure_debut)} – {heure(creneau.heure_fin)}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800">{creneau.matiere}</p>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setFormulaire({ jour })}
                  className="border-t border-slate-100 py-2 text-sm text-slate-400 transition hover:bg-slate-50 hover:text-indigo-600"
                >
                  + Ajouter
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// =====================================================================
// Formulaire d'ajout / de modification d'un créneau
// =====================================================================
function FormulaireCreneau({
  classeId,
  creneau,
  jourParDefaut,
  creneauxExistants,
  onFermer,
  onEnregistre,
}: {
  classeId: string;
  creneau: Creneau | null; // null = nouveau créneau
  jourParDefaut: number;
  creneauxExistants: Creneau[];
  onFermer: () => void;
  onEnregistre: (description: string) => void; // description du changement, pour prévenir les parents
}) {
  const [jour, setJour] = useState(creneau?.jour ?? jourParDefaut);
  const [debut, setDebut] = useState(creneau ? heure(creneau.heure_debut) : "14:00");
  const [fin, setFin] = useState(creneau ? heure(creneau.heure_fin) : "15:30");
  const [matiere, setMatiere] = useState(creneau?.matiere ?? "");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");

    if (fin <= debut) {
      setErreur("L'heure de fin doit être après l'heure de début.");
      return;
    }

    // Vérifie qu'il n'y a pas de chevauchement avec un autre créneau du même jour
    const chevauchement = creneauxExistants.find(
      (c) => c.id !== creneau?.id && c.jour === jour && debut < heure(c.heure_fin) && fin > heure(c.heure_debut)
    );
    if (chevauchement) {
      setErreur(
        `Ce créneau chevauche « ${chevauchement.matiere} » (${heure(chevauchement.heure_debut)} – ${heure(chevauchement.heure_fin)}).`
      );
      return;
    }

    setEnCours(true);
    const donnees = { classe_id: classeId, jour, heure_debut: debut, heure_fin: fin, matiere: matiere.trim() };
    const { error } = creneau
      ? await db().from("emplois_du_temps").update(donnees).eq("id", creneau.id)
      : await db().from("emplois_du_temps").insert(donnees);
    setEnCours(false);

    if (error) {
      setErreur(messageErreur(error));
      return;
    }
    const nouveau = `${JOURS[jour - 1]} de ${debut} à ${fin} (${matiere.trim()})`;
    onEnregistre(
      creneau
        ? `La séance du ${JOURS[creneau.jour - 1].toLowerCase()} de ${heure(creneau.heure_debut)} à ${heure(creneau.heure_fin)} (${creneau.matiere}) a lieu désormais le ${nouveau.charAt(0).toLowerCase() + nouveau.slice(1)}.`
        : `Nouvelle séance : ${nouveau.charAt(0).toLowerCase() + nouveau.slice(1)}.`
    );
  }

  async function supprimer() {
    if (!creneau || !confirm(`Supprimer le créneau « ${creneau.matiere} » ?`)) return;
    const { error } = await db().from("emplois_du_temps").delete().eq("id", creneau.id);
    if (error) {
      setErreur(messageErreur(error));
      return;
    }
    onEnregistre(
      `La séance du ${JOURS[creneau.jour - 1].toLowerCase()} de ${heure(creneau.heure_debut)} à ${heure(creneau.heure_fin)} (${creneau.matiere}) est supprimée de l'emploi du temps.`
    );
  }

  return (
    <Carte titre={creneau ? "Modifier le créneau" : "Nouveau créneau"}>
      <form onSubmit={enregistrer} className="space-y-4">
        {erreur && <Alerte type="erreur">{erreur}</Alerte>}
        <div className="grid grid-cols-4 gap-4">
          <Liste label="Jour" value={jour} onChange={(e) => setJour(Number(e.target.value))}>
            {JOURS.map((nom, i) => (
              <option key={nom} value={i + 1}>
                {nom}
              </option>
            ))}
          </Liste>
          <Champ label="Début" type="time" required value={debut} onChange={(e) => setDebut(e.target.value)} />
          <Champ label="Fin" type="time" required value={fin} onChange={(e) => setFin(e.target.value)} />
          <Champ
            label="Matière"
            required
            maxLength={60}
            placeholder="ex : Anglais"
            value={matiere}
            onChange={(e) => setMatiere(e.target.value)}
          />
        </div>
        <div className="flex justify-between">
          <div className="flex gap-2">
            <Bouton type="submit" disabled={enCours}>
              {enCours ? "Enregistrement..." : "Enregistrer"}
            </Bouton>
            <Bouton type="button" variante="secondaire" onClick={onFermer}>
              Annuler
            </Bouton>
          </div>
          {creneau && (
            <Bouton type="button" variante="danger" onClick={supprimer}>
              Supprimer ce créneau
            </Bouton>
          )}
        </div>
      </form>
    </Carte>
  );
}
