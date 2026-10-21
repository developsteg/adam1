"use client";
// Bandeau de choix de l'enfant (affiché seulement si le parent en a plusieurs).
import { useSessionParent } from "@/lib/parents/session";
import { nomClasse } from "@/lib/parents/outils";

export default function ChoixEnfant() {
  const { enfants, enfant, choisirEnfant } = useSessionParent();
  if (enfants.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2.5">
      {enfants.map((e) => {
        const actif = e.id === enfant?.id;
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => choisirEnfant(e.id)}
            className={`shrink-0 rounded-xl border px-3.5 py-2 text-left ${
              actif ? "border-indigo-600 bg-indigo-600" : "border-slate-200 bg-slate-50"
            }`}
          >
            <span className={`block text-sm font-bold ${actif ? "text-white" : "text-slate-900"}`}>{e.prenom}</span>
            <span className={`block text-xs ${actif ? "text-indigo-100" : "text-slate-500"}`}>{nomClasse(e)}</span>
          </button>
        );
      })}
    </div>
  );
}
