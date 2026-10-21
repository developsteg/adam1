// Liste déroulante des classes, regroupées par niveau.
import type { Classe, Niveau } from "@/lib/types";
import { Liste } from "@/components/ui";

export default function SelecteurClasse({
  niveaux,
  classes,
  valeur,
  onChange,
  optionVide,
}: {
  niveaux: Niveau[];
  classes: Classe[];
  valeur: string;
  onChange: (classeId: string) => void;
  optionVide?: string; // ex : "Toutes les classes"
}) {
  return (
    <Liste label="Classe" value={valeur} onChange={(e) => onChange(e.target.value)}>
      {optionVide && <option value="">{optionVide}</option>}
      {niveaux.map((niveau) => (
        <optgroup key={niveau.id} label={niveau.nom}>
          {classes
            .filter((c) => c.niveau_id === niveau.id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {niveau.nom} – {c.nom}
              </option>
            ))}
        </optgroup>
      ))}
    </Liste>
  );
}
