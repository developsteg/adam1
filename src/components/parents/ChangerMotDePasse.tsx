"use client";
// Première connexion (compte créé par l'enseignante) : le parent remplace
// le mot de passe provisoire.
import { useState } from "react";
import { creerClientSupabase } from "@/lib/supabase/client";
import { EnteteMarque, PageConnexion, styleBoutonParent, styleBoutonSecondaire, styleChampParent } from "./ui";

export default function ChangerMotDePasse() {
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    if (motDePasse.length < 8) return setErreur("Le mot de passe doit contenir au moins 8 caractères.");
    if (motDePasse !== confirmation) return setErreur("Les deux mots de passe ne sont pas identiques.");

    setEnCours(true);
    // Nouveau mot de passe + on retire l'obligation de le changer
    const { error } = await creerClientSupabase().auth.updateUser({
      password: motDePasse,
      data: { doit_changer_mot_de_passe: false },
    });
    setEnCours(false);
    if (error) {
      setErreur(
        error.message.toLowerCase().includes("different")
          ? "Choisissez un mot de passe différent du mot de passe provisoire."
          : "Impossible de changer le mot de passe. Réessayez."
      );
    }
    // Si tout va bien, l'espace parents s'affiche automatiquement
  }

  return (
    <PageConnexion>
      <EnteteMarque sousTitre="Bienvenue ! Choisissez votre mot de passe personnel" />
      <form onSubmit={valider} className="mt-8 space-y-4">
        {erreur && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{erreur}</p>}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Nouveau mot de passe (8 caractères minimum)</span>
          <input
            type="password"
            autoComplete="new-password"
            className={styleChampParent}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Confirmez le mot de passe</span>
          <input
            type="password"
            autoComplete="new-password"
            className={styleChampParent}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </label>
        <button type="submit" disabled={enCours} className={styleBoutonParent}>
          {enCours ? "Enregistrement..." : "Valider"}
        </button>
        <button type="button" onClick={() => creerClientSupabase().auth.signOut()} className={styleBoutonSecondaire}>
          Se déconnecter
        </button>
      </form>
    </PageConnexion>
  );
}
