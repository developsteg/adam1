"use client";
// Espace parents (web) — Documents envoyés par l'enseignante
// (pour la classe de l'enfant ou pour l'enfant lui-même).
import { useCallback, useEffect, useState } from "react";
import { creerClientSupabase } from "@/lib/supabase/client";
import { useSessionParent } from "@/lib/parents/session";
import { ouvrirFichier } from "@/lib/parents/fichiers";
import { formaterDate } from "@/lib/format";
import type { DocumentPartage } from "@/lib/types";
import { EcranVide, Etiquette } from "@/components/parents/ui";

// Type de fichier -> étiquette
function genre(type: string | null) {
  if (type === "application/pdf") return { texte: "PDF", couleur: "rouge" as const, icone: "📕" };
  if (type?.startsWith("image/")) return { texte: "Image", couleur: "vert" as const, icone: "🖼️" };
  return { texte: "Word", couleur: "bleu" as const, icone: "📘" };
}

export default function DocumentsParent() {
  const { enfant } = useSessionParent();
  const [documents, setDocuments] = useState<DocumentPartage[]>([]);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    if (!enfant) return;
    // Documents de la classe de l'enfant OU envoyés à l'enfant seul
    const filtre = enfant.classe_id
      ? `classe_id.eq.${enfant.classe_id},eleve_id.eq.${enfant.id}`
      : `eleve_id.eq.${enfant.id}`;
    const { data } = await creerClientSupabase()
      .from("documents")
      .select("*")
      .or(filtre)
      .order("created_at", { ascending: false });
    setDocuments(data ?? []);
  }, [enfant]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function ouvrir(doc: DocumentPartage) {
    setErreur("");
    try {
      await ouvrirFichier(doc.fichier_chemin);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      {erreur && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{erreur}</p>}
      {documents.length === 0 ? (
        <EcranVide texte="Aucun document pour le moment." />
      ) : (
        documents.map((doc) => {
          const g = genre(doc.type);
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => ouvrir(doc)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left active:bg-slate-50"
            >
              <span className="text-2xl">{g.icone}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">{doc.titre}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <Etiquette texte={g.texte} couleur={g.couleur} />
                  {formaterDate(doc.created_at.slice(0, 10))}
                  {doc.eleve_id && <span className="text-xs font-bold text-or-700">Personnel</span>}
                </span>
              </span>
              <span className="text-sm font-semibold text-indigo-600">Ouvrir</span>
            </button>
          );
        })
      )}
    </div>
  );
}
