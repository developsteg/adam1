// Petits composants d'interface réutilisés dans toutes les pages
// (pour garder un design cohérent sans répéter les classes Tailwind).
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

// Style commun des champs de saisie
export const styleChamp =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100";

type Variante = "principal" | "secondaire" | "danger";

const stylesBouton: Record<Variante, string> = {
  principal: "bg-indigo-600 text-white hover:bg-indigo-700",
  secondaire: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
};

export function Bouton({
  variante = "principal",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${stylesBouton[variante]} ${className}`}
      {...props}
    />
  );
}

export function Champ({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input className={styleChamp} {...props} />
    </label>
  );
}

export function Liste({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <select className={styleChamp} {...props}>
        {children}
      </select>
    </label>
  );
}

export function Carte({ titre, children, actions }: { titre?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {(titre || actions) && (
        <div className="mb-4 flex items-center justify-between gap-4">
          {titre && <h2 className="text-lg font-semibold text-slate-800">{titre}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function EnTetePage({ titre, description }: { titre: string; description?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">{titre}</h1>
      {description && <p className="mt-1 text-slate-500">{description}</p>}
    </header>
  );
}

export function Alerte({ type, children }: { type: "erreur" | "succes"; children: ReactNode }) {
  const style =
    type === "erreur"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return <div className={`rounded-lg border px-4 py-3 text-sm ${style}`}>{children}</div>;
}
