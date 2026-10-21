"use client";
// Page "Élèves" : liste filtrable + ajout d'un élève avec le compte de son parent.
import { useCallback, useEffect, useMemo, useState } from "react";
import { creerClientSupabase } from "@/lib/supabase/client";
import { messageErreur, messageErreurFonction } from "@/lib/erreurs";
import type { Classe, Eleve, Niveau, Profil } from "@/lib/types";
import { Alerte, Bouton, Carte, Champ, EnTetePage, Liste, styleChamp } from "@/components/ui";

// Un élève avec les infos de son parent (jointure Supabase)
type EleveComplet = Eleve & { parent: Pick<Profil, "id" | "nom" | "telephone"> | null };

// Identifiants du compte parent créé, à transmettre au parent
type CompteCree = { email: string; mot_de_passe: string; nomEleve: string };

// Raccourci vers le client Supabase du navigateur
const db = creerClientSupabase;

export default function PageEleves() {
  const [eleves, setEleves] = useState<EleveComplet[]>([]);
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [parents, setParents] = useState<Profil[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  // Filtres
  const [filtreNiveau, setFiltreNiveau] = useState("");
  const [filtreClasse, setFiltreClasse] = useState("");
  const [recherche, setRecherche] = useState("");

  // Formulaire : null = fermé, "nouveau" = ajout, sinon l'élève à modifier
  const [formulaire, setFormulaire] = useState<null | "nouveau" | EleveComplet>(null);
  const [compteCree, setCompteCree] = useState<CompteCree | null>(null);

  const charger = useCallback(async () => {
    const [resEleves, resNiveaux, resClasses, resParents] = await Promise.all([
      db().from("eleves").select("*, parent:profiles(id, nom, telephone)").order("nom").order("prenom"),
      db().from("niveaux").select("*").order("ordre").order("nom"),
      db().from("classes").select("*").order("nom"),
      db().from("profiles").select("*").eq("role", "parent").eq("statut", "valide").order("nom"),
    ]);
    const premiereErreur = resEleves.error ?? resNiveaux.error ?? resClasses.error ?? resParents.error;
    if (premiereErreur) setErreur(messageErreur(premiereErreur));
    setEleves((resEleves.data as EleveComplet[]) ?? []);
    setNiveaux(resNiveaux.data ?? []);
    setClasses(resClasses.data ?? []);
    setParents(resParents.data ?? []);
    setChargement(false);
  }, []);

  useEffect(() => {
    // Chargement initial des données depuis Supabase
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  // Nom complet d'une classe, ex : "1ère année – Groupe A"
  const nomClasse = useCallback(
    (classeId: string | null) => {
      const classe = classes.find((c) => c.id === classeId);
      if (!classe) return "Sans classe";
      const niveau = niveaux.find((n) => n.id === classe.niveau_id);
      return `${niveau?.nom ?? "?"} – ${classe.nom}`;
    },
    [classes, niveaux]
  );

  // Classes proposées dans le filtre (limitées au niveau choisi)
  const classesFiltrees = filtreNiveau ? classes.filter((c) => c.niveau_id === filtreNiveau) : classes;

  // Application des filtres à la liste
  const elevesAffiches = useMemo(() => {
    const texte = recherche.trim().toLowerCase();
    return eleves.filter((eleve) => {
      const classe = classes.find((c) => c.id === eleve.classe_id);
      if (filtreNiveau && classe?.niveau_id !== filtreNiveau) return false;
      if (filtreClasse === "aucune" && eleve.classe_id) return false;
      if (filtreClasse && filtreClasse !== "aucune" && eleve.classe_id !== filtreClasse) return false;
      if (texte) {
        const contenu = `${eleve.nom} ${eleve.prenom} ${eleve.parent?.nom ?? ""}`.toLowerCase();
        if (!contenu.includes(texte)) return false;
      }
      return true;
    });
  }, [eleves, classes, filtreNiveau, filtreClasse, recherche]);

  async function supprimer(eleve: EleveComplet) {
    if (!confirm(`Supprimer l'élève ${eleve.prenom} ${eleve.nom} ?\nSes absences et documents personnels seront aussi supprimés.`)) return;
    setErreur("");
    const { error } = await db().from("eleves").delete().eq("id", eleve.id);
    if (error) {
      setErreur(
        error.code === "23503"
          ? "Impossible de supprimer cet élève : des paiements sont enregistrés à son nom."
          : messageErreur(error)
      );
      return;
    }
    charger();
  }

  if (chargement) return <p className="text-slate-500">Chargement...</p>;

  return (
    <>
      <div className="flex items-start justify-between">
        <EnTetePage titre="Élèves" description={`${eleves.length} élève${eleves.length > 1 ? "s" : ""} inscrit${eleves.length > 1 ? "s" : ""}`} />
        {!formulaire && (
          <Bouton
            onClick={() => {
              setCompteCree(null);
              setFormulaire("nouveau");
            }}
            disabled={classes.length === 0}
            title={classes.length === 0 ? "Créez d'abord une classe" : undefined}
          >
            + Ajouter un élève
          </Bouton>
        )}
      </div>

      <div className="space-y-4">
        {erreur && <Alerte type="erreur">{erreur}</Alerte>}

        {compteCree && (
          <Alerte type="succes">
            <p className="font-semibold">{compteCree.nomEleve} a été ajouté(e). Compte parent créé :</p>
            <p className="mt-2">
              Email : <strong>{compteCree.email}</strong>
              <br />
              Mot de passe provisoire : <strong className="font-mono text-base">{compteCree.mot_de_passe}</strong>
            </p>
            <p className="mt-2">
              Transmettez ces informations au parent. Il devra changer son mot de passe à la première connexion.
              <br />
              <strong>Ce mot de passe ne sera plus affiché.</strong>
            </p>
            <Bouton
              variante="secondaire"
              className="mt-3"
              onClick={() =>
                navigator.clipboard.writeText(
                  `Application Mrs Ilhem\nEmail : ${compteCree.email}\nMot de passe provisoire : ${compteCree.mot_de_passe}`
                )
              }
            >
              Copier les identifiants
            </Bouton>
          </Alerte>
        )}

        {formulaire && (
          <FormulaireEleve
            eleve={formulaire === "nouveau" ? null : formulaire}
            niveaux={niveaux}
            classes={classes}
            parents={parents}
            nomClasse={nomClasse}
            onFermer={() => setFormulaire(null)}
            onEnregistre={(compte) => {
              setFormulaire(null);
              setCompteCree(compte);
              charger();
            }}
          />
        )}

        {/* ---------- Filtres ---------- */}
        <Carte>
          <div className="grid grid-cols-3 gap-4">
            <Liste
              label="Niveau"
              value={filtreNiveau}
              onChange={(e) => {
                setFiltreNiveau(e.target.value);
                setFiltreClasse("");
              }}
            >
              <option value="">Tous les niveaux</option>
              {niveaux.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nom}
                </option>
              ))}
            </Liste>
            <Liste label="Classe" value={filtreClasse} onChange={(e) => setFiltreClasse(e.target.value)}>
              <option value="">Toutes les classes</option>
              {classesFiltrees.map((c) => (
                <option key={c.id} value={c.id}>
                  {nomClasse(c.id)}
                </option>
              ))}
              {!filtreNiveau && <option value="aucune">Sans classe</option>}
            </Liste>
            <Champ label="Rechercher" placeholder="Nom de l'élève ou du parent" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </div>

          {/* ---------- Tableau ---------- */}
          <table className="mt-6 w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 font-medium">Élève</th>
                <th className="py-2 font-medium">Classe</th>
                <th className="py-2 font-medium">Parent</th>
                <th className="py-2 font-medium">Téléphone</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {elevesAffiches.map((eleve) => (
                <tr key={eleve.id} className="hover:bg-slate-50">
                  <td className="py-3 font-medium text-slate-800">
                    {eleve.nom} {eleve.prenom}
                  </td>
                  <td className="py-3 text-slate-600">{nomClasse(eleve.classe_id)}</td>
                  <td className="py-3 text-slate-600">{eleve.parent?.nom || "—"}</td>
                  <td className="py-3 text-slate-600">{eleve.parent?.telephone || "—"}</td>
                  <td className="py-3 text-right">
                    <span className="inline-flex gap-2">
                      <Bouton
                        variante="secondaire"
                        onClick={() => {
                          setCompteCree(null);
                          setFormulaire(eleve);
                        }}
                      >
                        Modifier
                      </Bouton>
                      <Bouton variante="danger" onClick={() => supprimer(eleve)}>
                        Supprimer
                      </Bouton>
                    </span>
                  </td>
                </tr>
              ))}
              {elevesAffiches.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    {eleves.length === 0 ? "Aucun élève pour le moment." : "Aucun élève ne correspond aux filtres."}
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
// Formulaire d'ajout / de modification d'un élève
// =====================================================================
function FormulaireEleve({
  eleve,
  niveaux,
  classes,
  parents,
  nomClasse,
  onFermer,
  onEnregistre,
}: {
  eleve: EleveComplet | null; // null = nouvel élève
  niveaux: Niveau[];
  classes: Classe[];
  parents: Profil[];
  nomClasse: (classeId: string | null) => string;
  onFermer: () => void;
  onEnregistre: (compte: CompteCree | null) => void;
}) {
  const modification = eleve !== null;

  // Élève
  const [nom, setNom] = useState(eleve?.nom ?? "");
  const [prenom, setPrenom] = useState(eleve?.prenom ?? "");
  const [classeId, setClasseId] = useState(eleve?.classe_id ?? classes[0]?.id ?? "");

  // Parent : nouveau compte, ou parent déjà inscrit (frères et sœurs)
  const [modeParent, setModeParent] = useState<"nouveau" | "existant">(modification ? "existant" : "nouveau");
  const [parentId, setParentId] = useState(eleve?.parent_id ?? "");
  const [parentNom, setParentNom] = useState("");
  const [parentTelephone, setParentTelephone] = useState("");
  const [parentEmail, setParentEmail] = useState("");

  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur("");

    let idDuParent: string | null = parentId || null;
    let compte: CompteCree | null = null;

    // 1) Création du compte parent via l'Edge Function sécurisée
    if (!modification && modeParent === "nouveau") {
      const { data, error } = await db().functions.invoke("creer-compte-parent", {
        body: { nom: parentNom.trim(), telephone: parentTelephone.trim(), email: parentEmail.trim() },
      });
      if (error) {
        setErreur(await messageErreurFonction(error));
        setEnCours(false);
        return;
      }
      idDuParent = data.parent_id;
      compte = { email: data.email, mot_de_passe: data.mot_de_passe, nomEleve: `${prenom} ${nom}` };
    }

    // 2) Enregistrement de l'élève
    const donnees = { nom: nom.trim(), prenom: prenom.trim(), classe_id: classeId || null, parent_id: idDuParent };
    const { error } = modification
      ? await db().from("eleves").update(donnees).eq("id", eleve.id)
      : await db().from("eleves").insert(donnees);

    if (error) {
      setErreur(
        messageErreur(error) +
          (compte ? ` Le compte parent (${compte.email}) a quand même été créé : choisissez "Parent déjà inscrit".` : "")
      );
      setEnCours(false);
      return;
    }

    onEnregistre(compte);
  }

  return (
    <Carte titre={modification ? `Modifier ${eleve.prenom} ${eleve.nom}` : "Nouvel élève"}>
      <form onSubmit={enregistrer} className="space-y-6">
        {erreur && <Alerte type="erreur">{erreur}</Alerte>}

        {/* ---------- Élève ---------- */}
        <fieldset>
          <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Élève</legend>
          <div className="grid grid-cols-3 gap-4">
            <Champ label="Nom" required maxLength={60} value={nom} onChange={(e) => setNom(e.target.value)} />
            <Champ label="Prénom" required maxLength={60} value={prenom} onChange={(e) => setPrenom(e.target.value)} />
            <Liste label="Classe" value={classeId} onChange={(e) => setClasseId(e.target.value)}>
              <option value="">Sans classe</option>
              {niveaux.map((niveau) => (
                <optgroup key={niveau.id} label={niveau.nom}>
                  {classes
                    .filter((c) => c.niveau_id === niveau.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {nomClasse(c.id)}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Liste>
          </div>
        </fieldset>

        {/* ---------- Parent ---------- */}
        <fieldset>
          <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Parent</legend>

          {!modification && (
            <div className="mb-4 flex gap-6 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={modeParent === "nouveau"} onChange={() => setModeParent("nouveau")} />
                Nouveau parent (créer son compte)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={modeParent === "existant"}
                  onChange={() => setModeParent("existant")}
                  disabled={parents.length === 0}
                />
                Parent déjà inscrit (frère / sœur)
              </label>
            </div>
          )}

          {modeParent === "nouveau" ? (
            <div className="grid grid-cols-3 gap-4">
              <Champ label="Nom complet du parent" required minLength={2} maxLength={100} value={parentNom} onChange={(e) => setParentNom(e.target.value)} />
              <Champ label="Téléphone" type="tel" maxLength={20} pattern="[0-9 +]{8,20}" title="Chiffres, espaces et + uniquement (8 chiffres minimum)" placeholder="ex : 20 123 456" value={parentTelephone} onChange={(e) => setParentTelephone(e.target.value)} />
              <Champ label="Email (identifiant de connexion)" type="email" required maxLength={120} value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} />
              <p className="col-span-3 text-sm text-slate-500">
                Un mot de passe provisoire sera généré et affiché après l&apos;enregistrement.
              </p>
            </div>
          ) : (
            <div className="max-w-md">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Parent</span>
                <select className={styleChamp} value={parentId} onChange={(e) => setParentId(e.target.value)} required={!modification}>
                  <option value="">{modification ? "Aucun parent" : "Choisir un parent..."}</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom || "(sans nom)"} {p.telephone ? `– ${p.telephone}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </fieldset>

        <div className="flex gap-2">
          <Bouton type="submit" disabled={enCours}>
            {enCours ? "Enregistrement..." : "Enregistrer"}
          </Bouton>
          <Bouton type="button" variante="secondaire" onClick={onFermer} disabled={enCours}>
            Annuler
          </Bouton>
        </div>
      </form>
    </Carte>
  );
}
