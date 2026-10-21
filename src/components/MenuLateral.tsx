"use client";
// Menu de gauche, présent sur toutes les pages de l'espace enseignante.
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { creerClientSupabase } from "@/lib/supabase/client";
import { useMessagesTempsReel } from "@/lib/useMessagesTempsReel";

const liens = [
  { href: "/tableau-de-bord", label: "Tableau de bord" },
  { href: "/classes", label: "Classes" },
  { href: "/eleves", label: "Élèves" },
  { href: "/demandes", label: "Demandes" },
  { href: "/emploi-du-temps", label: "Emploi du temps" },
  { href: "/programmes", label: "Programmes" },
  { href: "/absences", label: "Absences" },
  { href: "/messages", label: "Messages" },
  { href: "/documents", label: "Documents" },
  { href: "/paiements", label: "Paiements" },
];

export default function MenuLateral({ nomEnseignante, idEnseignante }: { nomEnseignante: string; idEnseignante: string }) {
  const cheminActuel = usePathname();
  const router = useRouter();

  // Nombre de messages privés non lus (badge sur "Messages"), mis à jour en temps réel
  const [nonLus, setNonLus] = useState(0);
  const compterNonLus = useCallback(async () => {
    const { count } = await creerClientSupabase()
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("destinataire_id", idEnseignante)
      .eq("lu", false);
    setNonLus(count ?? 0);
  }, [idEnseignante]);

  // Nombre de demandes d'inscription de parents en attente (badge sur "Demandes")
  const [demandes, setDemandes] = useState(0);
  useEffect(() => {
    creerClientSupabase()
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("statut", "en_attente")
      .then(({ count }) => setDemandes(count ?? 0));
  }, [cheminActuel]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    compterNonLus();
  }, [compterNonLus]);
  useMessagesTempsReel("badge-menu", compterNonLus);

  async function seDeconnecter() {
    await creerClientSupabase().auth.signOut();
    router.push("/connexion");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <Image src="/logo.png" alt="Logo Learn English with Mrs Ilhem" width={52} height={52} priority />
        <div>
          <p className="text-base font-bold leading-tight text-indigo-700">Learn English With Mrs Ilhem</p>
          <p className="text-sm text-or-700">Espace enseignante</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {liens.map((lien) => {
          const actif = cheminActuel.startsWith(lien.href);
          return (
            <Link
              key={lien.href}
              href={lien.href}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                actif ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {lien.label}
              {lien.href === "/messages" && nonLus > 0 && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">{nonLus}</span>
              )}
              {lien.href === "/demandes" && demandes > 0 && (
                <span className="rounded-full bg-or-500 px-2 py-0.5 text-xs font-semibold text-white">{demandes}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-6 py-4">
        <p className="truncate text-sm font-medium text-slate-700">{nomEnseignante}</p>
        <button onClick={seDeconnecter} className="mt-1 text-sm text-slate-500 hover:text-red-600">
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
