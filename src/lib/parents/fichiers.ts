"use client";
// Ouverture d'un fichier privé (document ou reçu) depuis l'espace parents web.
// Le bucket "documents" est privé : on crée un lien signé valable 60 secondes
// (le RLS vérifie que le fichier concerne bien un enfant du parent).
import { creerClientSupabase } from "@/lib/supabase/client";

export async function ouvrirFichier(chemin: string) {
  // L'onglet est ouvert TOUT DE SUITE (pendant le clic) : sinon Safari sur iPhone
  // bloque l'ouverture, qui arrive après l'attente du lien signé.
  const fenetre = window.open("", "_blank");

  const { data, error } = await creerClientSupabase().storage.from("documents").createSignedUrl(chemin, 60);
  if (error || !data) {
    fenetre?.close();
    throw new Error("Vous n'avez pas accès à ce fichier.");
  }

  if (fenetre) fenetre.location.href = data.signedUrl;
  else window.location.assign(data.signedUrl); // ouverture bloquée : on l'ouvre dans la page
}
