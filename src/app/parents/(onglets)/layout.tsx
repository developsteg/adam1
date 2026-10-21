"use client";
// Espace parents (web) : en-tête, choix de l'enfant, contenu et barre
// d'onglets en bas (comme l'application Android).
// Choisit aussi l'écran à afficher selon l'état du compte :
//  - pas connecté             -> page de connexion
//  - 1re connexion            -> changement du mot de passe provisoire
//  - compte pas encore validé -> "demande envoyée"
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { creerClientSupabase } from "@/lib/supabase/client";
import { useSessionParent } from "@/lib/parents/session";
import { useMessagesTempsReel } from "@/lib/useMessagesTempsReel";
import ChoixEnfant from "@/components/parents/ChoixEnfant";
import EnAttente from "@/components/parents/EnAttente";
import ChangerMotDePasse from "@/components/parents/ChangerMotDePasse";
import { Chargement, EnteteMarque, PageConnexion, styleBoutonParent } from "@/components/parents/ui";

const ONGLETS = [
  { href: "/parents", label: "Accueil", icone: "🏠" },
  { href: "/parents/absences", label: "Absences", icone: "📅" },
  { href: "/parents/documents", label: "Documents", icone: "📄" },
  { href: "/parents/messages", label: "Messages", icone: "💬" },
  { href: "/parents/paiements", label: "Paiements", icone: "🧾" },
];

// Nombre de messages privés non lus (pastille sur l'onglet Messages)
function useMessagesNonLus(idParent: string | undefined) {
  const [nonLus, setNonLus] = useState(0);
  const compter = useCallback(async () => {
    if (!idParent) return;
    const { count } = await creerClientSupabase()
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("destinataire_id", idParent)
      .eq("lu", false);
    setNonLus(count ?? 0);
  }, [idParent]);

  useEffect(() => {
    compter();
  }, [compter]);
  useMessagesTempsReel("parents-badge-messages", compter);
  return nonLus;
}

export default function LayoutOngletsParents({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const chemin = usePathname();
  const { chargement, session, role, statut, doitChangerMotDePasse, nomParent } = useSessionParent();
  const nonLus = useMessagesNonLus(role === "parent" && statut === "valide" ? session?.user.id : undefined);

  // Pas connecté : page de connexion
  useEffect(() => {
    if (!chargement && !session) router.replace("/parents/connexion");
  }, [chargement, session, router]);

  if (chargement || !session || statut === null) return <Chargement />;

  // Compte de l'enseignante ouvert par erreur dans l'espace parents
  if (role === "enseignante") {
    return (
      <PageConnexion>
        <EnteteMarque sousTitre="Espace parents" />
        <p className="mt-6 text-center text-slate-700">
          Vous êtes connectée avec le compte de l&apos;enseignante. Cet espace est réservé aux parents.
        </p>
        <Link href="/tableau-de-bord" className={`${styleBoutonParent} mt-8 block text-center`}>
          Aller au tableau de bord
        </Link>
      </PageConnexion>
    );
  }

  if (doitChangerMotDePasse) return <ChangerMotDePasse />;
  if (statut !== "valide") return <EnAttente />;

  async function seDeconnecter() {
    if (!confirm("Voulez-vous vous déconnecter ?")) return;
    await creerClientSupabase().auth.signOut();
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* ---------- En-tête ---------- */}
      <header className="sticky top-0 z-10 bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-2xl items-center gap-3 border-b border-slate-200 px-4 py-2.5">
          <Image src="/logo.png" alt="" width={36} height={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-indigo-700">Learn English With Mrs Ilhem</p>
            <p className="truncate text-xs text-or-700">{nomParent || "Espace parents"}</p>
          </div>
          <button type="button" onClick={seDeconnecter} className="rounded-lg px-2 py-1 text-sm text-slate-500">
            Déconnexion
          </button>
        </div>
        <div className="mx-auto max-w-2xl">
          <ChoixEnfant />
        </div>
      </header>

      {/* ---------- Contenu (place laissée pour la barre d'onglets) ---------- */}
      <main className="mx-auto max-w-2xl px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4">{children}</main>

      {/* ---------- Barre d'onglets ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-2xl grid-cols-5">
          {ONGLETS.map((o) => {
            const actif = o.href === "/parents" ? chemin === "/parents" : chemin.startsWith(o.href);
            return (
              <Link
                key={o.href}
                href={o.href}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                  actif ? "text-indigo-700" : "text-slate-400"
                }`}
              >
                <span className={`text-xl ${actif ? "" : "opacity-60 grayscale"}`}>{o.icone}</span>
                {o.label}
                {o.href === "/parents/messages" && nonLus > 0 && (
                  <span className="absolute right-[18%] top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] leading-5 text-white">
                    {nonLus}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
