"use client";
// Espace parents (web) — Absences et retards de l'enfant.
import { useCallback, useEffect, useState } from "react";
import { creerClientSupabase } from "@/lib/supabase/client";
import { useSessionParent } from "@/lib/parents/session";
import { formaterDate } from "@/lib/format";
import { CarteParent, EcranVide, Etiquette } from "@/components/parents/ui";

type Ligne = { id: string; statut: "absent" | "retard"; seance: { date_seance: string } | null };

export default function AbsencesParent() {
  const { enfant } = useSessionParent();
  const [lignes, setLignes] = useState<Ligne[]>([]);

  const charger = useCallback(async () => {
    if (!enfant) return;
    const { data } = await creerClientSupabase()
      .from("presences")
      .select("id, statut, seance:seances(date_seance)")
      .eq("eleve_id", enfant.id)
      .neq("statut", "present")
      .returns<Ligne[]>();
    // Du plus récent au plus ancien
    setLignes((data ?? []).sort((a, b) => (b.seance?.date_seance ?? "").localeCompare(a.seance?.date_seance ?? "")));
  }, [enfant]);

  useEffect(() => {
    charger();
  }, [charger]);

  const nbAbsences = lignes.filter((l) => l.statut === "absent").length;
  const nbRetards = lignes.filter((l) => l.statut === "retard").length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <CarteParent className="text-center">
          <p className="text-3xl font-extrabold text-red-600">{nbAbsences}</p>
          <p className="text-sm text-slate-500">absence{nbAbsences > 1 ? "s" : ""}</p>
        </CarteParent>
        <CarteParent className="text-center">
          <p className="text-3xl font-extrabold text-orange-600">{nbRetards}</p>
          <p className="text-sm text-slate-500">retard{nbRetards > 1 ? "s" : ""}</p>
        </CarteParent>
      </div>

      {lignes.length === 0 ? (
        <EcranVide texte={`Aucune absence ni retard pour ${enfant?.prenom ?? "votre enfant"}. Bravo !`} />
      ) : (
        lignes.map((l) => (
          <CarteParent key={l.id} className="flex items-center justify-between">
            <span className="font-semibold text-slate-900">{l.seance ? formaterDate(l.seance.date_seance) : "—"}</span>
            {l.statut === "absent" ? <Etiquette texte="Absent" couleur="rouge" /> : <Etiquette texte="Retard" couleur="orange" />}
          </CarteParent>
        ))
      )}
    </div>
  );
}
