"use client";
// Page "Demandes" : comptes créés par les parents depuis l'application mobile.
// Valider = relier le parent à son enfant (élève existant ou nouvel élève).
// Tant qu'il n'est pas validé, le parent ne voit aucune donnée.
import { useCallback, useEffect, useState } from "react";
import { creerClientSupabase } from "@/lib/supabase/client";
import { messageErreur } from "@/lib/erreurs";
import type { Classe, Eleve, Niveau, Profil } from "@/lib/types";
import { Alerte, Bouton, Carte, Champ, EnTetePage, Liste } from "@/components/ui";

// Raccourci vers le client Supabase du navigateur
const db = creerClientSupabase;

export default function PageDemandes() {
  const [demandes, setDemandes] = useState<Profil[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  const charger = useCallback(async () => {
    const [resDemandes, resEleves, resClasses, resNiveaux] = await Promise.all([
      db().from("profiles").select("*").eq("role", "parent").eq("statut", "en_attente").order("created_at"),
      db().from("eleves").select("*").order("nom").order("prenom"),
      db().from("classes").select("*").order("nom"),
      db().from("niveaux").select("*").order("ordre").order("nom"),
    ]);
    const premiereErreur = resDemandes.error ?? resEleves.error ?? resClasses.error ?? resNiveaux.error;
    if (premiereErreur) setErreur(messageErreur(premiereErreur));
    setDemandes(resDemandes.data ?? []);
    setEleves(resEleves.data ?? []);
    setClasses(resClasses.data ?? []);
    setNiveaux(resNiveaux.data ?? []);
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

  async function refuser(parent: Profil) {
    if (!confirm(`Refuser la demande de ${parent.nom} ? Le parent n'aura pas accès à l'application.`)) return;
    setErreur("");
    setSucces("");
    const { error } = await db().from("profiles").update({ statut: "refuse" }).eq("id", parent.id);
    if (error) return setErreur(messageErreur(error));
    setSucces(`Demande de ${parent.nom} refusée.`);
    charger();
  }

  return (
    <>
      <EnTetePage
        titre="Demandes d'inscription"
        description="Parents qui ont créé leur compte depuis l'application. Reliez chacun à son enfant pour lui donner accès."
      />

      <div className="space-y-6">
        {erreur && <Alerte type="erreur">{erreur}</Alerte>}
        {succes && <Alerte type="succes">{succes}</Alerte>}

        {chargement ? (
          <p className="text-slate-500">Chargement...</p>
        ) : demandes.length === 0 ? (
          <Carte>
            <p className="py-6 text-center text-slate-500">Aucune demande en attente.</p>
          </Carte>
        ) : (
          demandes.map((demande) => (
            <CarteDemande
              key={demande.id}
              demande={demande}
              eleves={eleves}
              classes={classes}
              nomClasse={nomClasse}
              onRefuser={() => refuser(demande)}
              onValidee={(message) => {
                setErreur("");
                setSucces(message);
                charger();
              }}
              onErreur={(message) => {
                setSucces("");
                setErreur(message);
              }}
            />
          ))
        )}
      </div>
    </>
  );
}

// =====================================================================
// Une demande : infos du parent + choix de l'enfant à relier
// =====================================================================
function CarteDemande({
  demande,
  eleves,
  classes,
  nomClasse,
  onRefuser,
  onValidee,
  onErreur,
}: {
  demande: Profil;
  eleves: Eleve[];
  classes: Classe[];
  nomClasse: (classeId: string | null) => string;
  onRefuser: () => void;
  onValidee: (message: string) => void;
  onErreur: (message: string) => void;
}) {
  // "existant" = l'élève est déjà dans la liste, "nouveau" = on le crée maintenant
  const [mode, setMode] = useState<"existant" | "nouveau">("existant");
  const [eleveId, setEleveId] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [classeId, setClasseId] = useState(classes[0]?.id ?? "");
  const [enCours, setEnCours] = useState(false);

  const dateDemande = new Date(demande.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);

    // 1) Relier l'enfant au parent
    if (mode === "existant") {
      if (!eleveId) {
        setEnCours(false);
        return onErreur("Choisissez l'élève à relier à ce parent.");
      }
      const eleve = eleves.find((el) => el.id === eleveId);
      if (eleve?.parent_id && !confirm("Cet élève a déjà un parent relié. Le remplacer par ce nouveau compte ?")) {
        setEnCours(false);
        return;
      }
      const { error } = await db().from("eleves").update({ parent_id: demande.id }).eq("id", eleveId);
      if (error) {
        setEnCours(false);
        return onErreur(messageErreur(error));
      }
    } else {
      if (!nom.trim() || !prenom.trim()) {
        setEnCours(false);
        return onErreur("Indiquez le nom et le prénom de l'élève.");
      }
      const { error } = await db()
        .from("eleves")
        .insert({ nom: nom.trim(), prenom: prenom.trim(), classe_id: classeId || null, parent_id: demande.id });
      if (error) {
        setEnCours(false);
        return onErreur(messageErreur(error));
      }
    }

    // 2) Le compte devient "valide" : le parent a maintenant accès à l'application
    const { error } = await db().from("profiles").update({ statut: "valide" }).eq("id", demande.id);
    setEnCours(false);
    if (error) return onErreur(messageErreur(error));
    onValidee(`Compte de ${demande.nom} validé. Il peut maintenant utiliser l'application.`);
  }

  return (
    <Carte>
      <div className="grid gap-6 md:grid-cols-2">
        {/* ---------- Infos envoyées par le parent ---------- */}
        <div className="space-y-1 text-sm">
          <p className="text-lg font-semibold text-slate-800">{demande.nom || "(sans nom)"}</p>
          <p className="text-slate-600">📞 {demande.telephone || "—"}</p>
          <p className="text-slate-600">✉️ {demande.email || "—"}</p>
          <p className="pt-2 text-slate-600">
            Enfant indiqué : <strong className="text-slate-800">{demande.enfant_demande || "—"}</strong>
          </p>
          <p className="pt-2 text-xs text-slate-400">Demande du {dateDemande}</p>
        </div>

        {/* ---------- Validation ---------- */}
        <form onSubmit={valider} className="space-y-3">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "existant"} onChange={() => setMode("existant")} />
              Élève déjà inscrit
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "nouveau"} onChange={() => setMode("nouveau")} />
              Nouvel élève
            </label>
          </div>

          {mode === "existant" ? (
            <Liste label="Élève" value={eleveId} onChange={(e) => setEleveId(e.target.value)}>
              <option value="">Choisir l&apos;élève...</option>
              {eleves.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.nom} {el.prenom} ({nomClasse(el.classe_id)}){el.parent_id ? " – a déjà un parent" : ""}
                </option>
              ))}
            </Liste>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Champ label="Nom" value={nom} maxLength={60} onChange={(e) => setNom(e.target.value)} />
              <Champ label="Prénom" value={prenom} maxLength={60} onChange={(e) => setPrenom(e.target.value)} />
              <div className="col-span-2">
                <Liste label="Classe" value={classeId} onChange={(e) => setClasseId(e.target.value)}>
                  <option value="">Sans classe</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {nomClasse(c.id)}
                    </option>
                  ))}
                </Liste>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Bouton type="submit" disabled={enCours}>
              {enCours ? "Validation..." : "Valider le compte"}
            </Bouton>
            <Bouton type="button" variante="danger" onClick={onRefuser} disabled={enCours}>
              Refuser
            </Bouton>
          </div>
        </form>
      </div>
    </Carte>
  );
}
