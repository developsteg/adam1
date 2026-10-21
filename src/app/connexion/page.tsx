"use client";
// Page de connexion de l'institutrice (email + mot de passe).
import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { creerClientSupabase } from "@/lib/supabase/client";
import { Alerte, Bouton, Champ } from "@/components/ui";

function FormulaireConnexion() {
  const router = useRouter();
  const parametres = useSearchParams();

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(
    parametres.get("erreur") === "acces" ? "Cet espace est réservé à l'enseignante." : ""
  );

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur("");
    const supabase = creerClientSupabase();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    if (error || !data.user) {
      setErreur("Email ou mot de passe incorrect.");
      setEnCours(false);
      return;
    }

    // Vérifie le rôle : un parent est envoyé vers l'espace parents
    const { data: profil } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    if (profil?.role === "parent") {
      router.push("/parents");
      return;
    }
    if (profil?.role !== "enseignante") {
      await supabase.auth.signOut();
      setErreur("Cet espace est réservé à l'enseignante.");
      setEnCours(false);
      return;
    }

    router.push("/tableau-de-bord");
    router.refresh();
  }

  return (
    <form onSubmit={seConnecter} className="space-y-4">
      {erreur && <Alerte type="erreur">{erreur}</Alerte>}
      <Champ label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Champ
        label="Mot de passe"
        type="password"
        required
        autoComplete="current-password"
        value={motDePasse}
        onChange={(e) => setMotDePasse(e.target.value)}
      />
      <Bouton type="submit" disabled={enCours} className="w-full">
        {enCours ? "Connexion..." : "Se connecter"}
      </Bouton>
    </form>
  );
}

export default function PageConnexion() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Image
          src="/logo.png"
          alt="Logo Learn English with Mrs Ilhem"
          width={120}
          height={120}
          priority
          className="mx-auto"
        />
        <h1 className="mt-4 text-center text-2xl font-bold text-indigo-700">Learn English With Mrs Ilhem</h1>
        <p className="mb-6 mt-1 text-center text-or-700">Espace enseignante</p>
        {/* Suspense est requis par Next.js quand on lit les paramètres de l'URL */}
        <Suspense>
          <FormulaireConnexion />
        </Suspense>
        <a href="/parents/connexion" className="mt-6 block text-center text-sm text-slate-500">
          Vous êtes parent ? <span className="font-semibold text-indigo-700">Espace parents</span>
        </a>
      </div>
    </main>
  );
}
