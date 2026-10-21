"use client";
// Espace parents (web) — Paiements de l'enfant et reçus PDF.
import { useCallback, useEffect, useState } from "react";
import { creerClientSupabase } from "@/lib/supabase/client";
import { useSessionParent } from "@/lib/parents/session";
import { ouvrirFichier } from "@/lib/parents/fichiers";
import { formaterDate, formaterMontant, nomMois } from "@/lib/format";
import type { Paiement } from "@/lib/types";
import { CarteParent, EcranVide } from "@/components/parents/ui";

const MODES: Record<string, string> = { especes: "Espèces", virement: "Virement", cheque: "Chèque" };

type LignePaiement = Pick<Paiement, "id" | "montant" | "mois" | "date_paiement" | "mode" | "numero_recu" | "recu_chemin">;

export default function PaiementsParent() {
  const { enfant } = useSessionParent();
  const [paiements, setPaiements] = useState<LignePaiement[]>([]);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    if (!enfant) return;
    const { data } = await creerClientSupabase()
      .from("paiements")
      .select("id, montant, mois, date_paiement, mode, numero_recu, recu_chemin")
      .eq("eleve_id", enfant.id)
      .order("mois", { ascending: false })
      .returns<LignePaiement[]>();
    setPaiements(data ?? []);
  }, [enfant]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function ouvrirRecu(p: LignePaiement) {
    setErreur("");
    if (!p.recu_chemin) {
      setErreur("Le reçu de ce paiement n'est pas encore prêt. Contactez l'enseignante.");
      return;
    }
    try {
      await ouvrirFichier(p.recu_chemin);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      {erreur && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{erreur}</p>}
      {paiements.length === 0 ? (
        <EcranVide texte="Aucun paiement enregistré pour le moment." />
      ) : (
        paiements.map((p) => (
          <CarteParent key={p.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-slate-900">{nomMois(p.mois)}</p>
              <p className="text-sm text-slate-500">
                Payé le {formaterDate(p.date_paiement)} · {MODES[p.mode] ?? p.mode}
              </p>
              <p className="text-xs font-bold text-or-700">Reçu {p.numero_recu}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <p className="font-extrabold text-indigo-700">{formaterMontant(p.montant)}</p>
              <button
                type="button"
                onClick={() => ouvrirRecu(p)}
                className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-600"
              >
                Reçu PDF
              </button>
            </div>
          </CarteParent>
        ))
      )}
    </div>
  );
}
