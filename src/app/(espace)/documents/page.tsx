"use client";
// Page "Documents" : envoyer des cours, examens ou images à une classe
// ou à un élève. Les fichiers sont dans le bucket privé "documents" :
// on ne les ouvre qu'avec des liens signés temporaires.
import { useCallback, useEffect, useRef, useState } from "react";
import { creerClientSupabase } from "@/lib/supabase/client";
import { messageErreur, messageErreurFonction } from "@/lib/erreurs";
import type { Classe, DocumentPartage, Eleve, Niveau } from "@/lib/types";
import { Alerte, Bouton, Carte, Champ, EnTetePage, Liste } from "@/components/ui";
import SelecteurClasse from "@/components/SelecteurClasse";

// Raccourci vers le client Supabase du navigateur
const db = creerClientSupabase;

const TAILLE_MAX = 10 * 1024 * 1024; // 10 Mo (même limite que le bucket)

// Types de fichiers acceptés (même liste que le bucket Supabase)
const TYPES_ACCEPTES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "image/jpeg": "Image",
  "image/png": "Image",
  "image/webp": "Image",
};

const STYLE_TYPE: Record<string, string> = {
  PDF: "bg-red-100 text-red-700",
  Word: "bg-blue-100 text-blue-700",
  Image: "bg-emerald-100 text-emerald-700",
};

// 1 234 567 octets -> "1,2 Mo"
function formaterTaille(octets: number | null) {
  if (!octets) return "—";
  if (octets < 1024 * 1024) return `${Math.max(1, Math.round(octets / 1024))} Ko`;
  return `${(octets / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
}

// Nom de fichier sans accents ni caractères spéciaux (exigé par le stockage)
function nettoyerNomFichier(nom: string) {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
}

export default function PageDocuments() {
  const [documents, setDocuments] = useState<DocumentPartage[]>([]);
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [filtreClasse, setFiltreClasse] = useState("");

  const charger = useCallback(async () => {
    const [resDocs, resNiveaux, resClasses, resEleves] = await Promise.all([
      db().from("documents").select("*").order("created_at", { ascending: false }),
      db().from("niveaux").select("*").order("ordre").order("nom"),
      db().from("classes").select("*").order("nom"),
      db().from("eleves").select("*").order("nom").order("prenom"),
    ]);
    const premiereErreur = resDocs.error ?? resNiveaux.error ?? resClasses.error ?? resEleves.error;
    if (premiereErreur) setErreur(messageErreur(premiereErreur));
    setDocuments(resDocs.data ?? []);
    setNiveaux(resNiveaux.data ?? []);
    setClasses(resClasses.data ?? []);
    setEleves(resEleves.data ?? []);
    setChargement(false);
  }, []);

  useEffect(() => {
    // Chargement initial des données depuis Supabase
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  const nomClasse = (id: string | null) => {
    const classe = classes.find((c) => c.id === id);
    const niveau = niveaux.find((n) => n.id === classe?.niveau_id);
    return classe ? `${niveau?.nom ?? "?"} – ${classe.nom}` : "?";
  };
  const nomEleve = (id: string | null) => {
    const eleve = eleves.find((e) => e.id === id);
    return eleve ? `${eleve.prenom} ${eleve.nom}` : "?";
  };

  // Ouvre le fichier avec un lien signé valable 60 secondes
  async function ouvrir(doc: DocumentPartage) {
    setErreur("");
    const { data, error } = await db().storage.from("documents").createSignedUrl(doc.fichier_chemin, 60);
    if (error || !data) {
      setErreur("Impossible d'ouvrir ce fichier.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function supprimer(doc: DocumentPartage) {
    if (!confirm(`Supprimer le document « ${doc.titre} » ?\nLes parents n'y auront plus accès.`)) return;
    setErreur("");
    // 1) Le fichier dans le stockage, 2) la ligne dans la table
    const { error: erreurFichier } = await db().storage.from("documents").remove([doc.fichier_chemin]);
    if (erreurFichier) {
      setErreur("Impossible de supprimer le fichier : " + erreurFichier.message);
      return;
    }
    const { error } = await db().from("documents").delete().eq("id", doc.id);
    if (error) setErreur(messageErreur(error));
    charger();
  }

  if (chargement) return <p className="text-slate-500">Chargement...</p>;

  if (classes.length === 0) {
    return (
      <>
        <EnTetePage titre="Documents" />
        <Carte>
          <p className="text-slate-500">Créez d&apos;abord une classe dans la page Classes.</p>
        </Carte>
      </>
    );
  }

  // Filtre : documents de la classe choisie (et de ses élèves)
  const affiches = filtreClasse
    ? documents.filter(
        (d) => d.classe_id === filtreClasse || eleves.find((e) => e.id === d.eleve_id)?.classe_id === filtreClasse
      )
    : documents;

  return (
    <>
      <EnTetePage titre="Documents" description="Partagez des cours, examens et images avec les parents (PDF, Word, images – 10 Mo max)." />

      <div className="space-y-6">
        <FormulaireEnvoi niveaux={niveaux} classes={classes} eleves={eleves} nomClasse={nomClasse} onEnvoye={charger} />

        <Carte titre="Documents envoyés">
          {erreur && (
            <div className="mb-4">
              <Alerte type="erreur">{erreur}</Alerte>
            </div>
          )}
          <div className="w-72">
            <SelecteurClasse
              niveaux={niveaux}
              classes={classes}
              valeur={filtreClasse}
              onChange={setFiltreClasse}
              optionVide="Toutes les classes"
            />
          </div>

          <table className="mt-6 w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="w-20 py-2 font-medium">Type</th>
                <th className="py-2 font-medium">Titre</th>
                <th className="py-2 font-medium">Envoyé à</th>
                <th className="py-2 font-medium">Taille</th>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {affiches.map((doc) => {
                const type = TYPES_ACCEPTES[doc.type ?? ""] ?? "Fichier";
                return (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${STYLE_TYPE[type] ?? "bg-slate-100 text-slate-600"}`}>
                        {type}
                      </span>
                    </td>
                    <td className="py-3 font-medium text-slate-800">{doc.titre}</td>
                    <td className="py-3 text-slate-600">
                      {doc.classe_id ? `Classe ${nomClasse(doc.classe_id)}` : `Élève : ${nomEleve(doc.eleve_id)}`}
                    </td>
                    <td className="py-3 text-slate-600">{formaterTaille(doc.taille)}</td>
                    <td className="py-3 text-slate-600">{new Date(doc.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="py-3 text-right">
                      <span className="inline-flex gap-2">
                        <Bouton variante="secondaire" onClick={() => ouvrir(doc)}>
                          Ouvrir
                        </Bouton>
                        <Bouton variante="danger" onClick={() => supprimer(doc)}>
                          Supprimer
                        </Bouton>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {affiches.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Aucun document pour le moment.
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
// Formulaire d'envoi d'un document
// =====================================================================
function FormulaireEnvoi({
  niveaux,
  classes,
  eleves,
  nomClasse,
  onEnvoye,
}: {
  niveaux: Niveau[];
  classes: Classe[];
  eleves: Eleve[];
  nomClasse: (id: string | null) => string;
  onEnvoye: () => void;
}) {
  const [titre, setTitre] = useState("");
  const [destination, setDestination] = useState<"classe" | "eleve">("classe");
  const [classeId, setClasseId] = useState(classes[0]?.id ?? "");
  const [eleveId, setEleveId] = useState(eleves[0]?.id ?? "");
  const [fichier, setFichier] = useState<File | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const champFichier = useRef<HTMLInputElement>(null);

  function choisirFichier(f: File | null) {
    setErreur("");
    setSucces("");
    if (f && !TYPES_ACCEPTES[f.type]) {
      setErreur("Type de fichier non accepté. Formats possibles : PDF, Word (.doc, .docx), images (JPG, PNG, WEBP).");
      f = null;
    } else if (f && f.size > TAILLE_MAX) {
      setErreur(`Fichier trop lourd (${formaterTaille(f.size)}). La limite est de 10 Mo.`);
      f = null;
    }
    setFichier(f);
    if (!f && champFichier.current) champFichier.current.value = "";
    // Propose le nom du fichier comme titre
    if (f && !titre) setTitre(f.name.replace(/\.[^.]+$/, "").slice(0, 150));
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!fichier) {
      setErreur("Choisissez un fichier.");
      return;
    }
    setEnCours(true);
    setErreur("");
    setSucces("");

    // 1) Envoi du fichier dans le bucket privé
    const dossier = destination === "classe" ? `classes/${classeId}` : `eleves/${eleveId}`;
    const chemin = `${dossier}/${Date.now()}-${nettoyerNomFichier(fichier.name)}`;
    const { error: erreurEnvoi } = await db()
      .storage.from("documents")
      .upload(chemin, fichier, { contentType: fichier.type, upsert: false });
    if (erreurEnvoi) {
      setErreur("L'envoi du fichier a échoué : " + erreurEnvoi.message);
      setEnCours(false);
      return;
    }

    // 2) Enregistrement dans la table "documents"
    const { data, error } = await db()
      .from("documents")
      .insert({
        titre: titre.trim(),
        fichier_chemin: chemin,
        type: fichier.type,
        taille: fichier.size,
        classe_id: destination === "classe" ? classeId : null,
        eleve_id: destination === "eleve" ? eleveId : null,
      })
      .select("id")
      .single();
    if (error || !data) {
      // On retire le fichier pour ne pas laisser de fichier orphelin
      await db().storage.from("documents").remove([chemin]);
      setErreur(messageErreur(error));
      setEnCours(false);
      return;
    }

    // 3) Notification aux parents concernés
    let resume = `« ${titre.trim()} » a été envoyé.`;
    const resultat = await db().functions.invoke("notifier-document", { body: { document_id: data.id } });
    if (resultat.error) {
      resume += " Attention : la notification n'a pas pu partir (" + (await messageErreurFonction(resultat.error)) + ")";
    } else {
      const { envoyees, sans_application } = resultat.data;
      if (envoyees > 0) resume += ` ${envoyees} notification${envoyees > 1 ? "s" : ""} envoyée${envoyees > 1 ? "s" : ""}.`;
      if (sans_application > 0) {
        resume += ` ${sans_application} parent${sans_application > 1 ? "s n'ont" : " n'a"} pas encore l'application.`;
      }
    }

    setSucces(resume);
    setTitre("");
    setFichier(null);
    if (champFichier.current) champFichier.current.value = "";
    setEnCours(false);
    onEnvoye();
  }

  return (
    <Carte titre="Envoyer un document">
      <form onSubmit={envoyer} className="space-y-4">
        {erreur && <Alerte type="erreur">{erreur}</Alerte>}
        {succes && <Alerte type="succes">{succes}</Alerte>}

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Fichier (PDF, Word, image – 10 Mo max)</span>
            <input
              ref={champFichier}
              type="file"
              required
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
              onChange={(e) => choisirFichier(e.target.files?.[0] ?? null)}
              className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-600 file:mr-3 file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </label>
          <Champ label="Titre" required maxLength={150} placeholder="ex : Examen n°1 – Unit 2" value={titre} onChange={(e) => setTitre(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 items-end gap-4">
          <div className="flex gap-6 pb-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={destination === "classe"} onChange={() => setDestination("classe")} />
              Toute une classe
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={destination === "eleve"}
                onChange={() => setDestination("eleve")}
                disabled={eleves.length === 0}
              />
              Un seul élève
            </label>
          </div>
          {destination === "classe" ? (
            <SelecteurClasse niveaux={niveaux} classes={classes} valeur={classeId} onChange={setClasseId} />
          ) : (
            <Liste label="Élève" value={eleveId} onChange={(e) => setEleveId(e.target.value)}>
              {eleves.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.prenom} {el.nom} ({el.classe_id ? nomClasse(el.classe_id) : "sans classe"})
                </option>
              ))}
            </Liste>
          )}
        </div>

        <Bouton type="submit" disabled={enCours || !fichier}>
          {enCours ? "Envoi en cours..." : "Envoyer le document"}
        </Bouton>
      </form>
    </Carte>
  );
}
