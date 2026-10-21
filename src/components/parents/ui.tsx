// Petits composants de l'espace parents (web), pensés pour un téléphone.
import Image from "next/image";
import type { ReactNode } from "react";

export function Chargement() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
    </div>
  );
}

export function EcranVide({ texte }: { texte: string }) {
  return <p className="px-4 py-10 text-center text-sm text-slate-500">{texte}</p>;
}

export function CarteParent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`}>{children}</div>;
}

export function Etiquette({ texte, couleur }: { texte: string; couleur: "rouge" | "orange" | "vert" | "bleu" }) {
  const styles = {
    rouge: "bg-red-50 text-red-700",
    orange: "bg-orange-50 text-orange-700",
    vert: "bg-emerald-50 text-emerald-700",
    bleu: "bg-indigo-50 text-indigo-700",
  };
  return <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${styles[couleur]}`}>{texte}</span>;
}

// Logo + nom de l'application, en haut des écrans de connexion
export function EnteteMarque({ sousTitre }: { sousTitre: string }) {
  return (
    <div className="text-center">
      <Image src="/logo.png" alt="Logo Learn English With Mrs Ilhem" width={96} height={96} priority className="mx-auto" />
      <h1 className="mt-3 text-xl font-bold text-indigo-700">Learn English With Mrs Ilhem</h1>
      <p className="mt-1 text-sm font-semibold text-or-700">{sousTitre}</p>
    </div>
  );
}

// Page centrée des écrans de connexion / inscription
export function PageConnexion({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">{children}</main>
  );
}

// Champ de saisie assez grand pour un téléphone (police 16px : Safari ne zoome pas)
export const styleChampParent =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export const styleBoutonParent =
  "w-full rounded-xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50";

export const styleBoutonSecondaire =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50";
