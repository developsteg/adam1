"use client";
// Espace parents (web) — Accueil : fiche de l'enfant et emploi du temps de sa classe.
import { useCallback, useEffect, useState } from "react";
import { creerClientSupabase } from "@/lib/supabase/client";
import { useSessionParent } from "@/lib/parents/session";
import { JOURS, heure, jourAujourdhui, nomClasse } from "@/lib/parents/outils";
import type { Creneau } from "@/lib/types";
import AjouterEcranAccueil from "@/components/parents/AjouterEcranAccueil";
import { CarteParent, EcranVide } from "@/components/parents/ui";

export default function AccueilParent() {
  const { nomParent, enfant, enfants } = useSessionParent();
  const [creneaux, setCreneaux] = useState<Creneau[]>([]);

  const charger = useCallback(async () => {
    if (!enfant?.classe_id) {
      setCreneaux([]);
      return;
    }
    const { data } = await creerClientSupabase()
      .from("emplois_du_temps")
      .select("id, classe_id, jour, heure_debut, heure_fin")
      .eq("classe_id", enfant.classe_id)
      .order("jour")
      .order("heure_debut");
    setCreneaux(data ?? []);
  }, [enfant?.classe_id]);

  useEffect(() => {
    charger();
  }, [charger]);

  const aujourdhui = jourAujourdhui();
  const joursAvecCours = JOURS.map((nom, i) => ({ nom, numero: i + 1 })).filter((j) =>
    creneaux.some((c) => c.jour === j.numero)
  );

  return (
    <div className="space-y-3">
      <AjouterEcranAccueil />

      <p className="text-center text-sm font-semibold text-or-700">Bienvenue{nomParent ? ` ${nomParent}` : ""}</p>

      {!enfant ? (
        <EcranVide
          texte={
            enfants.length === 0
              ? "Aucun enfant n'est encore associé à votre compte. Contactez l'enseignante."
              : "Choisissez un enfant."
          }
        />
      ) : (
        <>
          {/* ---------- Fiche de l'enfant ---------- */}
          <CarteParent className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg font-extrabold text-white">
              {enfant.prenom.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="font-bold text-slate-900">
                {enfant.prenom} {enfant.nom}
              </p>
              <p className="text-sm font-semibold text-or-700">{nomClasse(enfant)}</p>
            </div>
          </CarteParent>

          {/* ---------- Emploi du temps ---------- */}
          <h2 className="pt-1 font-bold text-slate-900">Emploi du temps</h2>
          {joursAvecCours.length === 0 ? (
            <CarteParent>
              <EcranVide texte="L'emploi du temps n'est pas encore disponible." />
            </CarteParent>
          ) : (
            joursAvecCours.map((j) => {
              const estAujourdhui = j.numero === aujourdhui;
              return (
                <CarteParent key={j.numero} className={`space-y-2 ${estAujourdhui ? "border-2 border-or-500" : ""}`}>
                  <p className={`font-bold ${estAujourdhui ? "text-or-700" : "text-indigo-700"}`}>
                    {j.nom}
                    {estAujourdhui ? " · aujourd'hui" : ""}
                  </p>
                  {creneaux
                    .filter((c) => c.jour === j.numero)
                    .map((c) => (
                      <div key={c.id} className="flex items-center gap-3 rounded-xl bg-indigo-50 px-3 py-2.5">
                        <span className="min-w-28 text-sm font-bold text-indigo-600">
                          {heure(c.heure_debut)} – {heure(c.heure_fin)}
                        </span>
                      </div>
                    ))}
                </CarteParent>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
