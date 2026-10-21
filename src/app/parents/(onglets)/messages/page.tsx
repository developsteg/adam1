"use client";
// Espace parents (web) — Messages : discussion privée avec l'enseignante
// (en temps réel) + annonces envoyées à la classe de l'enfant.
import { useCallback, useEffect, useRef, useState } from "react";
import { creerClientSupabase } from "@/lib/supabase/client";
import { useSessionParent } from "@/lib/parents/session";
import { useMessagesTempsReel } from "@/lib/useMessagesTempsReel";
import { formaterMoment } from "@/lib/parents/outils";
import type { Message } from "@/lib/types";
import { EcranVide } from "@/components/parents/ui";

export default function MessagesParent() {
  const { session, enfants } = useSessionParent();
  const monId = session?.user.id ?? "";

  const [idEnseignante, setIdEnseignante] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [texte, setTexte] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const bas = useRef<HTMLDivElement>(null);

  // Classes des enfants (pour afficher le nom de la classe sur les annonces)
  const nomsClasses = new Map(enfants.filter((e) => e.classe_id).map((e) => [e.classe_id!, e.classe?.nom ?? "classe"]));

  const charger = useCallback(async () => {
    // Le RLS ne renvoie que les messages du parent et ceux des classes de ses enfants
    const { data } = await creerClientSupabase().from("messages").select("*").order("created_at").limit(500);
    setMessages(data ?? []);
  }, []);

  // Messages reçus -> "lu"
  const marquerLus = useCallback(async () => {
    if (!monId) return;
    await creerClientSupabase().from("messages").update({ lu: true }).eq("destinataire_id", monId).eq("lu", false);
  }, [monId]);

  useEffect(() => {
    // Identifiant de l'enseignante (destinataire des messages du parent)
    creerClientSupabase()
      .from("profiles")
      .select("id")
      .eq("role", "enseignante")
      .limit(1)
      .single()
      .then(({ data }) => setIdEnseignante(data?.id ?? null));
    charger();
    marquerLus();
  }, [charger, marquerLus]);

  // Temps réel : nouveau message -> on recharge et on marque comme lu
  useMessagesTempsReel("parents-messages", () => {
    charger();
    marquerLus();
  });

  // Toujours afficher le dernier message
  useEffect(() => {
    bas.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const contenu = texte.trim();
    if (!contenu || !idEnseignante) return;
    setEnCours(true);
    setErreur("");
    const { error } = await creerClientSupabase()
      .from("messages")
      .insert({ expediteur_id: monId, destinataire_id: idEnseignante, contenu });
    setEnCours(false);
    if (error) {
      setErreur("Le message n'a pas pu être envoyé. Vérifiez votre connexion.");
      return;
    }
    setTexte("");
    charger();
  }

  return (
    <div>
      <div className="space-y-2.5 pb-24">
        {messages.length === 0 && (
          <EcranVide texte="Aucun message. Écrivez à l'enseignante pour toute question concernant votre enfant." />
        )}
        {messages.map((m) => {
          const deMoi = m.expediteur_id === monId;
          const annonce = !!m.classe_id;
          return (
            <div key={m.id} className={`flex ${deMoi ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                  deMoi
                    ? "rounded-br-sm bg-indigo-600 text-white"
                    : annonce
                      ? "rounded-bl-sm border border-or-500 bg-or-100 text-slate-900"
                      : "rounded-bl-sm border border-slate-200 bg-white text-slate-900"
                }`}
              >
                {annonce && (
                  <p className="mb-1 text-xs font-bold text-or-700">
                    Annonce · classe {nomsClasses.get(m.classe_id!) ?? ""}
                  </p>
                )}
                <p className="whitespace-pre-line break-words text-[15px] leading-snug">{m.contenu}</p>
                <p className={`mt-1 text-right text-[11px] ${deMoi ? "text-indigo-200" : "text-slate-500"}`}>
                  {formaterMoment(m.created_at)}
                  {deMoi ? (m.lu ? " · Lu" : " · Envoyé") : ""}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bas} />
      </div>

      {/* ---------- Zone d'écriture (au-dessus de la barre d'onglets) ---------- */}
      <form
        onSubmit={envoyer}
        className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-10 border-t border-slate-200 bg-white p-2.5"
      >
        <div className="mx-auto max-w-2xl">
          {erreur && <p className="mb-1.5 text-sm text-red-600">{erreur}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder="Écrire à l'enseignante..."
              rows={1}
              maxLength={2000}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-base outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={enCours || !texte.trim() || !idEnseignante}
              className="h-11 rounded-full bg-indigo-600 px-4 font-semibold text-white disabled:opacity-50"
            >
              Envoyer
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
