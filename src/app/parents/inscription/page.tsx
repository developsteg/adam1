"use client";
// Espace parents (web) : demande d'inscription d'un parent.
// Le compte est créé "en attente" : l'enseignante le valide depuis le
// tableau de bord (page Demandes) en le reliant à son enfant.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { creerClientSupabase } from "@/lib/supabase/client";
import { messageErreurInscription } from "@/lib/parents/outils";
import { EnteteMarque, PageConnexion, styleBoutonParent, styleChampParent } from "@/components/parents/ui";

export default function PageInscriptionParent() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [enfant, setEnfant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  // Affiché si Supabase demande de confirmer l'email avant la première connexion
  const [emailAConfirmer, setEmailAConfirmer] = useState(false);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    if (nom.trim().length < 3) return setErreur("Indiquez votre nom et prénom.");
    if (telephone.trim().length < 8) return setErreur("Indiquez votre numéro de téléphone.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErreur("Adresse email invalide.");
    if (enfant.trim().length < 3) return setErreur("Indiquez le nom et prénom de votre enfant.");
    if (motDePasse.length < 8) return setErreur("Le mot de passe doit contenir au moins 8 caractères.");
    if (motDePasse !== confirmation) return setErreur("Les deux mots de passe ne sont pas identiques.");

    setEnCours(true);
    const { data, error } = await creerClientSupabase().auth.signUp({
      email: email.trim().toLowerCase(),
      password: motDePasse,
      // Recopiées dans le profil par la base (le compte reste "en attente")
      options: { data: { nom: nom.trim(), telephone: telephone.trim(), enfant: enfant.trim() } },
    });
    setEnCours(false);

    if (error) return setErreur(messageErreurInscription(error.message));
    if (!data.session) return setEmailAConfirmer(true);
    router.replace("/parents"); // affiche l'écran "demande envoyée"
  }

  if (emailAConfirmer) {
    return (
      <PageConnexion>
        <EnteteMarque sousTitre="Vérifiez vos emails" />
        <p className="mt-6 text-center text-slate-700">
          Un email de confirmation a été envoyé à {email.trim()}. Cliquez sur le lien qu&apos;il contient, puis
          revenez vous connecter.
        </p>
        <Link href="/parents/connexion" className={`${styleBoutonParent} mt-8 block text-center`}>
          Retour à la connexion
        </Link>
      </PageConnexion>
    );
  }

  const champs: {
    label: string;
    valeur: string;
    modifier: (v: string) => void;
    type?: string;
    autoComplete?: string;
    placeholder?: string;
    max?: number;
  }[] = [
    { label: "Votre nom et prénom", valeur: nom, modifier: setNom, autoComplete: "name", max: 100 },
    { label: "Téléphone", valeur: telephone, modifier: setTelephone, type: "tel", autoComplete: "tel", max: 30 },
    { label: "Email", valeur: email, modifier: setEmail, type: "email", autoComplete: "email", placeholder: "votre@email.com", max: 254 },
    {
      label: "Nom et prénom de votre enfant (et sa classe)",
      valeur: enfant,
      modifier: setEnfant,
      placeholder: "ex : Sami Ben Ali, 3e année",
      max: 120,
    },
    { label: "Mot de passe (8 caractères minimum)", valeur: motDePasse, modifier: setMotDePasse, type: "password", autoComplete: "new-password" },
    { label: "Confirmez le mot de passe", valeur: confirmation, modifier: setConfirmation, type: "password", autoComplete: "new-password" },
  ];

  return (
    <PageConnexion>
      <EnteteMarque sousTitre="Demande d'inscription (طلب تسجيل)" />

      <form onSubmit={envoyer} className="mt-8 space-y-4">
        {erreur && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{erreur}</p>}
        {champs.map((c) => (
          <label key={c.label} className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{c.label}</span>
            <input
              type={c.type ?? "text"}
              autoComplete={c.autoComplete}
              autoCapitalize={c.type === "email" ? "none" : undefined}
              placeholder={c.placeholder}
              maxLength={c.max}
              className={styleChampParent}
              value={c.valeur}
              onChange={(e) => c.modifier(e.target.value)}
            />
          </label>
        ))}
        <button type="submit" disabled={enCours} className={styleBoutonParent}>
          {enCours ? "Envoi..." : "Envoyer ma demande"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Votre compte sera activé dès que Mrs Ilhem aura validé votre demande.
      </p>
      <Link href="/parents/connexion" className="mt-4 block text-center text-slate-600">
        Déjà un compte ? <span className="font-bold text-indigo-700">Se connecter</span>
      </Link>
    </PageConnexion>
  );
}
