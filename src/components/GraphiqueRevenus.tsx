// Graphique en barres des revenus des 12 derniers mois.
// Une seule série : une seule couleur, barres fines arrondies en haut,
// valeur au survol et valeur écrite sur le mois en cours.
import { formaterMontant, nomMois, nomMoisCourt } from "@/lib/format";

export default function GraphiqueRevenus({ donnees }: { donnees: { mois: string; total: number }[] }) {
  const maximum = Math.max(...donnees.map((d) => d.total), 1);
  const dernier = donnees.length - 1;

  return (
    <div>
      <div className="flex h-56 items-end gap-2 border-b border-slate-200">
        {donnees.map((d, i) => (
          <div key={d.mois} className="group relative flex h-full flex-1 flex-col justify-end">
            {/* Info-bulle au survol */}
            <div className="pointer-events-none absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow group-hover:block">
              <p className="font-semibold">{formaterMontant(d.total)}</p>
              <p className="text-slate-300">{nomMois(d.mois)}</p>
            </div>
            {/* Valeur écrite uniquement pour le mois en cours */}
            {i === dernier && d.total > 0 && (
              <p className="mb-1 text-center text-xs font-semibold tabular-nums text-slate-700">
                {Math.round(d.total).toLocaleString("fr-FR")}
              </p>
            )}
            <div
              className={`mx-auto w-full max-w-9 rounded-t-[4px] transition group-hover:opacity-80 ${
                i === dernier ? "bg-indigo-600" : "bg-indigo-300"
              }`}
              style={{ height: `${(d.total / maximum) * 100}%`, minHeight: d.total > 0 ? 2 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {donnees.map((d, i) => (
          <p key={d.mois} className={`flex-1 text-center text-xs ${i === dernier ? "font-semibold text-slate-700" : "text-slate-400"}`}>
            {nomMoisCourt(d.mois)}
          </p>
        ))}
      </div>
    </div>
  );
}
