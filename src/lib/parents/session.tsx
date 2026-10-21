"use client";
// Espace parents (web) : session de connexion, profil du parent, ses enfants
// et l'enfant choisi. Même fonctionnement que l'application Android.
// La vraie protection des données reste le RLS de la base : un parent ne
// reçoit jamais que les données de ses propres enfants.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { creerClientSupabase } from "@/lib/supabase/client";
import type { Enfant } from "./outils";

type ContexteSession = {
  chargement: boolean;
  session: Session | null;
  nomParent: string;
  role: "parent" | "enseignante" | null;
  // "en_attente" / "refuse" : compte pas encore validé par l'enseignante ; null : pas encore chargé
  statut: "en_attente" | "valide" | "refuse" | null;
  doitChangerMotDePasse: boolean;
  enfants: Enfant[];
  enfant: Enfant | null; // l'enfant actuellement affiché
  choisirEnfant: (id: string) => void;
  recharger: () => Promise<void>;
};

const Contexte = createContext<ContexteSession | null>(null);

export function FournisseurSessionParent({ children }: { children: ReactNode }) {
  const [chargement, setChargement] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [nomParent, setNomParent] = useState("");
  const [role, setRole] = useState<ContexteSession["role"]>(null);
  const [statut, setStatut] = useState<ContexteSession["statut"]>(null);
  const [enfants, setEnfants] = useState<Enfant[]>([]);
  const [idEnfant, setIdEnfant] = useState<string | null>(null);

  // Charge le profil et les enfants du parent connecté
  const chargerDonnees = useCallback(async (s: Session | null) => {
    if (!s) {
      setNomParent("");
      setRole(null);
      setStatut(null);
      setEnfants([]);
      setIdEnfant(null);
      return;
    }
    const supabase = creerClientSupabase();
    const [resProfil, resEnfants] = await Promise.all([
      supabase.from("profiles").select("nom, role, statut").eq("id", s.user.id).single(),
      supabase
        .from("eleves")
        .select("id, nom, prenom, classe_id, classe:classes(nom, niveau:niveaux(nom))")
        .eq("parent_id", s.user.id)
        .order("prenom")
        .returns<Enfant[]>(),
    ]);
    setNomParent(resProfil.data?.nom ?? "");
    setRole(resProfil.data?.role === "enseignante" ? "enseignante" : "parent");
    // En cas d'erreur de lecture, on n'empêche pas l'accès : un compte non validé
    // n'a de toute façon aucun enfant relié et ne voit aucune donnée (RLS).
    setStatut(resProfil.error ? "valide" : (resProfil.data?.statut ?? "valide"));
    const liste = resEnfants.data ?? [];
    setEnfants(liste);
    setIdEnfant((actuel) => (liste.some((e) => e.id === actuel) ? actuel : (liste[0]?.id ?? null)));
  }, []);

  useEffect(() => {
    const supabase = creerClientSupabase();

    // Session déjà enregistrée dans le navigateur (si le parent s'est déjà connecté)
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await chargerDonnees(data.session);
      setChargement(false);
    });

    // Connexion / déconnexion / changement de mot de passe
    const { data } = supabase.auth.onAuthStateChange((evenement, nouvelleSession) => {
      setSession(nouvelleSession);
      if (evenement === "SIGNED_IN" || evenement === "SIGNED_OUT") {
        // setTimeout : recommandé par Supabase pour ne pas bloquer l'événement
        setTimeout(() => chargerDonnees(nouvelleSession), 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [chargerDonnees]);

  const valeur: ContexteSession = {
    chargement,
    session,
    nomParent,
    role,
    statut,
    doitChangerMotDePasse: session?.user.user_metadata?.doit_changer_mot_de_passe === true,
    enfants,
    enfant: enfants.find((e) => e.id === idEnfant) ?? null,
    choisirEnfant: setIdEnfant,
    recharger: () => chargerDonnees(session),
  };

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useSessionParent() {
  const contexte = useContext(Contexte);
  if (!contexte) throw new Error("useSessionParent doit être utilisé dans FournisseurSessionParent");
  return contexte;
}
