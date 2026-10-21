// Choix de plusieurs classes à la fois : cases à cocher regroupées par niveau,
// avec « Tout sélectionner » et un raccourci pour cocher tout un niveau.
import type { Classe, Niveau } from "@/lib/types";

export default function SelecteurClassesMultiple({
  niveaux,
  classes,
  valeur,
  onChange,
}: {
  niveaux: Niveau[];
  classes: Classe[];
  valeur: string[]; // identifiants des classes cochées
  onChange: (classesIds: string[]) => void;
}) {
  const bascule = (id: string) => onChange(valeur.includes(id) ? valeur.filter((v) => v !== id) : [...valeur, id]);

  // Coche (ou décoche) toutes les classes d'un niveau
  function basculerNiveau(niveauId: string) {
    const ids = classes.filter((c) => c.niveau_id === niveauId).map((c) => c.id);
    const toutesCochees = ids.every((id) => valeur.includes(id));
    onChange(toutesCochees ? valeur.filter((v) => !ids.includes(v)) : [...new Set([...valeur, ...ids])]);
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          Classes ({valeur.length} sur {classes.length})
        </span>
        <button
          type="button"
          onClick={() => onChange(valeur.length === classes.length ? [] : classes.map((c) => c.id))}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          {valeur.length === classes.length ? "Tout désélectionner" : "Tout sélectionner"}
        </button>
      </div>
      <div className="max-h-60 space-y-3 overflow-y-auto rounded-lg border border-slate-300 bg-white p-3">
        {niveaux
          .filter((n) => classes.some((c) => c.niveau_id === n.id))
          .map((niveau) => (
            <div key={niveau.id}>
              <button
                type="button"
                onClick={() => basculerNiveau(niveau.id)}
                title="Cocher ou décocher tout le niveau"
                className="text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-indigo-600"
              >
                {niveau.nom}
              </button>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {classes
                  .filter((c) => c.niveau_id === niveau.id)
                  .map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={valeur.includes(c.id)} onChange={() => bascule(c.id)} />
                      {c.nom}
                    </label>
                  ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
