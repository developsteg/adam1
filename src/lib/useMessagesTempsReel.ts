"use client";
// Appelle "surChangement" dès qu'un message est ajouté ou modifié
// dans la base (Supabase Realtime). Le RLS s'applique : on ne reçoit
// que les messages qu'on a le droit de voir.
import { useEffect, useRef } from "react";
import { creerClientSupabase } from "@/lib/supabase/client";

export function useMessagesTempsReel(nomCanal: string, surChangement: () => void) {
  // On garde toujours la dernière version de la fonction, sans se réabonner
  const rappel = useRef(surChangement);
  useEffect(() => {
    rappel.current = surChangement;
  });

  useEffect(() => {
    const supabase = creerClientSupabase();
    const canal = supabase
      .channel(nomCanal)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => rappel.current())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [nomCanal]);
}
