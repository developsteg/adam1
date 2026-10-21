"use client";
// Affiché tant que l'enseignante n'a pas validé le compte du parent
// (ou si la demande a été refusée).
import { useState } from "react";
import { creerClientSupabase } from "@/lib/supabase/client";
import { useSessionParent } from "@/lib/parents/session";
import { EnteteMarque, PageConnexion, styleBoutonParent, styleBoutonSecondaire } from "./ui";

export default function EnAttente() {
  const { nomParent, statut, recharger } = useSessionParent();
  const [verification, setVerification] = useState(false);
  const refuse = statut === "refuse";

  async function verifier() {
    setVerification(true);
    await recharger(); // si le compte est validé, l'espace s'affiche
    setVerification(false);
  }

  return (
    <PageConnexion>
      <EnteteMarque sousTitre={refuse ? "Demande refusée" : "Demande envoyée"} />
      {nomParent && <p className="mt-2 text-center text-slate-600">{nomParent}</p>}
      <p className="mt-6 text-center leading-relaxed text-slate-700">
        {refuse
          ? "Votre demande de compte n'a pas été acceptée. Pour toute question, contactez Mrs Ilhem au 96 487 105."
          : "Merci ! Votre compte est en attente de validation par Mrs Ilhem. Vous aurez accès aux absences, documents, paiements et messages dès qu'elle l'aura validé."}
      </p>
      <div className="mt-8 space-y-3">
        {!refuse && (
          <button type="button" onClick={verifier} disabled={verification} className={styleBoutonParent}>
            {verification ? "Vérification..." : "Vérifier si mon compte est validé"}
          </button>
        )}
        <button type="button" onClick={() => creerClientSupabase().auth.signOut()} className={styleBoutonSecondaire}>
          Se déconnecter
        </button>
      </div>
    </PageConnexion>
  );
}
