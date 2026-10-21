"use client";
// Page "Niveaux & Classes" : ajouter, modifier et supprimer.
import { useCallback, useEffect, useState } from "react";
import { creerClientSupabase } from "@/lib/supabase/client";
import { messageErreur } from "@/lib/erreurs";
import type { Classe, Niveau } from "@/lib/types";
import { Alerte, Bouton, Carte, Champ, EnTetePage, Liste, styleChamp } from "@/components/ui";

// Une classe avec le nombre d'élèves inscrits
type ClasseAvecEffectif = Classe & { eleves: { count: number }[] };

// Raccourci vers le client Supabase du navigateur
const db = creerClientSupabase;

export default function PageClasses() {
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const [classes, setClasses] = useState<ClasseAvecEffectif[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    const [resNiveaux, resClasses] = await Promise.all([
      db().from("niveaux").select("*").order("ordre").order("nom"),
      db().from("classes").select("*, eleves(count)").order("nom"),
    ]);
    if (resNiveaux.error || resClasses.error) {
      setErreur(messageErreur(resNiveaux.error ?? resClasses.error));
    }
    setNiveaux(resNiveaux.data ?? []);
    setClasses((resClasses.data as ClasseAvecEffectif[]) ?? []);
    setChargement(false);
  }, []);

  useEffect(() => {
    // Chargement initial des données depuis Supabase
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  // Exécute une action puis recharge la liste (ou affiche l'erreur)
  async function executer(action: PromiseLike<{ error: { code?: string; message?: string } | null }>) {
    setErreur("");
    const { error } = await action;
    if (error) {
      setErreur(messageErreur(error));
      return false;
    }
    await charger();
    return true;
  }

  if (chargement) return <p className="text-slate-500">Chargement...</p>;

  return (
    <>
      <EnTetePage titre="Niveaux & Classes" description="Organisez vos élèves par niveau scolaire et par classe." />
      {erreur && (
        <div className="mb-4">
          <Alerte type="erreur">{erreur}</Alerte>
        </div>
      )}

      <div className="grid grid-cols-[1fr_1.4fr] items-start gap-6">
        {/* ---------------- NIVEAUX ---------------- */}
        <Carte titre="Niveaux">
          <FormulaireNiveau
            onAjouter={(nom, ordre) => executer(db().from("niveaux").insert({ nom, ordre }))}
            ordreSuivant={niveaux.length + 1}
          />
          <ul className="mt-4 divide-y divide-slate-100">
            {niveaux.map((niveau) => (
              <LigneNiveau
                key={niveau.id}
                niveau={niveau}
                onModifier={(nom, ordre) => executer(db().from("niveaux").update({ nom, ordre }).eq("id", niveau.id))}
                onSupprimer={() => {
                  if (confirm(`Supprimer le niveau "${niveau.nom}" ?`)) {
                    executer(db().from("niveaux").delete().eq("id", niveau.id));
                  }
                }}
              />
            ))}
            {niveaux.length === 0 && <li className="py-3 text-sm text-slate-500">Aucun niveau pour le moment.</li>}
          </ul>
        </Carte>

        {/* ---------------- CLASSES ---------------- */}
        <Carte titre="Classes">
          {niveaux.length === 0 ? (
            <p className="text-sm text-slate-500">Créez d&apos;abord un niveau.</p>
          ) : (
            <FormulaireClasse
              niveaux={niveaux}
              onAjouter={(nom, niveau_id) => executer(db().from("classes").insert({ nom, niveau_id }))}
            />
          )}

          <div className="mt-4 space-y-5">
            {niveaux.map((niveau) => {
              const classesDuNiveau = classes.filter((c) => c.niveau_id === niveau.id);
              return (
                <div key={niveau.id}>
                  <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">{niveau.nom}</h3>
                  <ul className="divide-y divide-slate-100">
                    {classesDuNiveau.map((classe) => (
                      <LigneClasse
                        key={classe.id}
                        classe={classe}
                        niveaux={niveaux}
                        onModifier={(nom, niveau_id) =>
                          executer(db().from("classes").update({ nom, niveau_id }).eq("id", classe.id))
                        }
                        onSupprimer={() => {
                          const effectif = classe.eleves[0]?.count ?? 0;
                          const avertissement = effectif > 0 ? `\n${effectif} élève(s) n'auront plus de classe.` : "";
                          if (confirm(`Supprimer la classe "${classe.nom}" ?${avertissement}`)) {
                            executer(db().from("classes").delete().eq("id", classe.id));
                          }
                        }}
                      />
                    ))}
                    {classesDuNiveau.length === 0 && <li className="py-2 text-sm text-slate-400">Aucune classe</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        </Carte>
      </div>
    </>
  );
}

// ---------- Formulaire d'ajout d'un niveau ----------
function FormulaireNiveau({
  onAjouter,
  ordreSuivant,
}: {
  onAjouter: (nom: string, ordre: number) => Promise<boolean>;
  ordreSuivant: number;
}) {
  const [nom, setNom] = useState("");

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (await onAjouter(nom.trim(), ordreSuivant)) setNom("");
  }

  return (
    <form onSubmit={envoyer} className="flex items-end gap-2">
      <div className="flex-1">
        <Champ label="Nouveau niveau" placeholder="ex : 1ère année" required maxLength={60} value={nom} onChange={(e) => setNom(e.target.value)} />
      </div>
      <Bouton type="submit">Ajouter</Bouton>
    </form>
  );
}

// ---------- Une ligne de niveau (affichage ou modification) ----------
function LigneNiveau({
  niveau,
  onModifier,
  onSupprimer,
}: {
  niveau: Niveau;
  onModifier: (nom: string, ordre: number) => Promise<boolean>;
  onSupprimer: () => void;
}) {
  const [edition, setEdition] = useState(false);
  const [nom, setNom] = useState(niveau.nom);
  const [ordre, setOrdre] = useState(niveau.ordre);

  if (edition) {
    return (
      <li className="flex items-center gap-2 py-2">
        <input className={styleChamp} required maxLength={60} value={nom} onChange={(e) => setNom(e.target.value)} />
        <input
          className={`${styleChamp} w-20`}
          type="number"
          title="Ordre d'affichage"
          value={ordre}
          onChange={(e) => setOrdre(Number(e.target.value))}
        />
        <Bouton onClick={async () => (await onModifier(nom.trim(), ordre)) && setEdition(false)}>OK</Bouton>
        <Bouton variante="secondaire" onClick={() => setEdition(false)}>
          Annuler
        </Bouton>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between py-2">
      <span className="font-medium text-slate-800">{niveau.nom}</span>
      <span className="flex gap-2">
        <Bouton variante="secondaire" onClick={() => setEdition(true)}>
          Modifier
        </Bouton>
        <Bouton variante="danger" onClick={onSupprimer}>
          Supprimer
        </Bouton>
      </span>
    </li>
  );
}

// ---------- Formulaire d'ajout d'une classe ----------
function FormulaireClasse({
  niveaux,
  onAjouter,
}: {
  niveaux: Niveau[];
  onAjouter: (nom: string, niveauId: string) => Promise<boolean>;
}) {
  const [nom, setNom] = useState("");
  const [niveauId, setNiveauId] = useState(niveaux[0]?.id ?? "");

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (await onAjouter(nom.trim(), niveauId)) setNom("");
  }

  return (
    <form onSubmit={envoyer} className="flex items-end gap-2">
      <div className="flex-1">
        <Champ label="Nouvelle classe" placeholder="ex : Groupe A" required maxLength={60} value={nom} onChange={(e) => setNom(e.target.value)} />
      </div>
      <div className="w-44">
        <Liste label="Niveau" value={niveauId} onChange={(e) => setNiveauId(e.target.value)}>
          {niveaux.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nom}
            </option>
          ))}
        </Liste>
      </div>
      <Bouton type="submit">Ajouter</Bouton>
    </form>
  );
}

// ---------- Une ligne de classe (affichage ou modification) ----------
function LigneClasse({
  classe,
  niveaux,
  onModifier,
  onSupprimer,
}: {
  classe: ClasseAvecEffectif;
  niveaux: Niveau[];
  onModifier: (nom: string, niveauId: string) => Promise<boolean>;
  onSupprimer: () => void;
}) {
  const [edition, setEdition] = useState(false);
  const [nom, setNom] = useState(classe.nom);
  const [niveauId, setNiveauId] = useState(classe.niveau_id);
  const effectif = classe.eleves[0]?.count ?? 0;

  if (edition) {
    return (
      <li className="flex items-center gap-2 py-2">
        <input className={styleChamp} required maxLength={60} value={nom} onChange={(e) => setNom(e.target.value)} />
        <select className={`${styleChamp} w-44`} value={niveauId} onChange={(e) => setNiveauId(e.target.value)}>
          {niveaux.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nom}
            </option>
          ))}
        </select>
        <Bouton onClick={async () => (await onModifier(nom.trim(), niveauId)) && setEdition(false)}>OK</Bouton>
        <Bouton variante="secondaire" onClick={() => setEdition(false)}>
          Annuler
        </Bouton>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between py-2">
      <span>
        <span className="font-medium text-slate-800">{classe.nom}</span>
        <span className="ml-2 text-sm text-slate-500">
          {effectif} élève{effectif > 1 ? "s" : ""}
        </span>
      </span>
      <span className="flex gap-2">
        <Bouton variante="secondaire" onClick={() => setEdition(true)}>
          Modifier
        </Bouton>
        <Bouton variante="danger" onClick={onSupprimer}>
          Supprimer
        </Bouton>
      </span>
    </li>
  );
}
