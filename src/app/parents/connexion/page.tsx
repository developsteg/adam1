"use client";
// Espace parents (web) : connexion du parent.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { creerClientSupabase } from "@/lib/supabase/client";
import { useSessionParent } from "@/lib/parents/session";
import { EnteteMarque, PageConnexion, styleBoutonParent, styleChampParent } from "@/components/parents/ui";

export default function PageConnexionParent() {
  const router = useRouter();
  const { chargement, session } = useSessionParent();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  // Déjà connecté : on va directement à l'espace
  useEffect(() => {
    if (!chargement && session) router.replace("/parents");
  }, [chargement, session, router]);

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    if (!email.trim() || !motDePasse) return setErreur("Entrez votre email et votre mot de passe.");

    setEnCours(true);
    const { error } = await creerClientSupabase().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: motDePasse,
    });
    setEnCours(false);
    if (error) return setErreur("Email ou mot de passe incorrect.");
    router.replace("/parents");
  }

  return (
    <PageConnexion>
      <EnteteMarque sousTitre="Espace parents" />

      <form onSubmit={seConnecter} className="mt-8 space-y-4">
        {erreur && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{erreur}</p>}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="votre@email.com"
            className={styleChampParent}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Mot de passe</span>
          <input
            type="password"
            autoComplete="current-password"
            className={styleChampParent}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
        </label>
        <button type="submit" disabled={enCours} className={styleBoutonParent}>
          {enCours ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <Link href="/parents/inscription" className="mt-6 block text-center text-slate-600">
        Nouveau parent ? <span className="font-bold text-indigo-700">Demande d&apos;inscription</span>
      </Link>
      <p className="mt-4 text-center text-sm text-slate-500">
        Mot de passe oublié ? Contactez l&apos;enseignante au 96 487 105.
      </p>
    </PageConnexion>
  );
}
