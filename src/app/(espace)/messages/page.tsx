"use client";
// Page "Messages" : conversations privées avec les parents
// et messages envoyés à une classe entière. Mise à jour en temps réel.
// L'enseignante peut supprimer un ou plusieurs messages (ils disparaissent
// aussi de l'application des parents).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { creerClientSupabase } from "@/lib/supabase/client";
import { messageErreur, messageErreurFonction } from "@/lib/erreurs";
import { useMessagesTempsReel } from "@/lib/useMessagesTempsReel";
import type { Classe, Eleve, Message, Niveau, Profil } from "@/lib/types";
import { Alerte, Bouton, EnTetePage, styleChamp } from "@/components/ui";

// Raccourci vers le client Supabase du navigateur
const db = creerClientSupabase;

// Conversation ouverte : avec un parent, ou avec une classe
type Vue = { type: "parent"; id: string } | { type: "classe"; id: string } | null;

// "2026-09-24T14:05:00Z" -> "24/09 14:05"
function formaterMoment(date: string) {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PageMessages() {
  const [monId, setMonId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [parents, setParents] = useState<Profil[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const [onglet, setOnglet] = useState<"parents" | "classes">("parents");
  const [vue, setVue] = useState<Vue>(null);

  // Chargement de toutes les données utiles
  const charger = useCallback(async () => {
    const [resUtilisateur, resMessages, resParents, resEleves, resClasses, resNiveaux] = await Promise.all([
      db().auth.getUser(),
      db().from("messages").select("*").order("created_at").limit(2000),
      db().from("profiles").select("*").eq("role", "parent").eq("statut", "valide").order("nom"),
      db().from("eleves").select("*").order("prenom"),
      db().from("classes").select("*").order("nom"),
      db().from("niveaux").select("*").order("ordre").order("nom"),
    ]);
    const premiereErreur = resMessages.error ?? resParents.error ?? resEleves.error ?? resClasses.error;
    if (premiereErreur) setErreur(messageErreur(premiereErreur));
    setMonId(resUtilisateur.data.user?.id ?? "");
    setMessages(resMessages.data ?? []);
    setParents(resParents.data ?? []);
    setEleves(resEleves.data ?? []);
    setClasses(resClasses.data ?? []);
    setNiveaux(resNiveaux.data ?? []);
    setChargement(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  // Temps réel : on recharge dès qu'un message arrive ou change
  useMessagesTempsReel("page-messages", charger);

  // ---------- Petites fonctions d'affichage ----------
  const nomParent = (id: string) => parents.find((p) => p.id === id)?.nom || "Parent";
  const enfantsDe = (idParent: string) =>
    eleves
      .filter((e) => e.parent_id === idParent)
      .map((e) => e.prenom)
      .join(", ");
  const nomClasse = (id: string) => {
    const classe = classes.find((c) => c.id === id);
    const niveau = niveaux.find((n) => n.id === classe?.niveau_id);
    return classe ? `${niveau?.nom ?? "?"} – ${classe.nom}` : "Classe";
  };

  // ---------- Conversations avec les parents (la plus récente en haut) ----------
  const conversations = useMemo(() => {
    const parParent = new Map<string, { dernier: Message; nonLus: number }>();
    for (const m of messages) {
      if (m.classe_id) continue;
      const idParent = m.expediteur_id === monId ? m.destinataire_id : m.expediteur_id;
      if (!idParent) continue;
      const actuelle = parParent.get(idParent) ?? { dernier: m, nonLus: 0 };
      actuelle.dernier = m; // les messages sont triés du plus ancien au plus récent
      if (m.destinataire_id === monId && !m.lu) actuelle.nonLus++;
      parParent.set(idParent, actuelle);
    }
    return [...parParent.entries()]
      .map(([idParent, infos]) => ({ idParent, ...infos }))
      .sort((a, b) => b.dernier.created_at.localeCompare(a.dernier.created_at));
  }, [messages, monId]);

  // ---------- Messages de la conversation ouverte ----------
  const filConversation = useMemo(() => {
    if (!vue) return [];
    if (vue.type === "classe") return messages.filter((m) => m.classe_id === vue.id);
    return messages.filter(
      (m) =>
        !m.classe_id &&
        ((m.expediteur_id === vue.id && m.destinataire_id === monId) ||
          (m.expediteur_id === monId && m.destinataire_id === vue.id))
    );
  }, [messages, vue, monId]);

  // En ouvrant une conversation avec un parent, ses messages passent en "lu"
  useEffect(() => {
    if (vue?.type !== "parent" || !monId) return;
    const nonLus = messages.some((m) => m.expediteur_id === vue.id && m.destinataire_id === monId && !m.lu);
    if (!nonLus) return;
    db()
      .from("messages")
      .update({ lu: true })
      .eq("expediteur_id", vue.id)
      .eq("destinataire_id", monId)
      .eq("lu", false)
      .then(() => charger());
  }, [vue, messages, monId, charger]);

  if (chargement) return <p className="text-slate-500">Chargement...</p>;

  // Élèves ayant un parent : pour démarrer une nouvelle conversation
  const elevesAvecParent = eleves.filter((e) => e.parent_id);

  return (
    <>
      <EnTetePage titre="Messages" description="Échangez avec les parents, en privé ou avec toute une classe." />
      {erreur && (
        <div className="mb-4">
          <Alerte type="erreur">{erreur}</Alerte>
        </div>
      )}

      <div className="flex h-[calc(100vh-13rem)] min-h-[28rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* =============== Colonne de gauche : liste =============== */}
        <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200">
          <div className="flex border-b border-slate-200 text-sm font-medium">
            {(["parents", "classes"] as const).map((o) => (
              <button
                key={o}
                onClick={() => setOnglet(o)}
                className={`flex-1 py-3 transition ${
                  onglet === o ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {o === "parents" ? "Parents" : "Classes"}
              </button>
            ))}
          </div>

          {onglet === "parents" ? (
            <>
              {/* Nouvelle conversation à partir d'un élève */}
              <div className="border-b border-slate-100 p-3">
                <select
                  className={styleChamp}
                  value=""
                  onChange={(e) => {
                    const eleve = eleves.find((el) => el.id === e.target.value);
                    if (eleve?.parent_id) setVue({ type: "parent", id: eleve.parent_id });
                  }}
                >
                  <option value="">✉ Écrire au parent d&apos;un élève...</option>
                  {elevesAvecParent.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.prenom} {e.nom} ({nomParent(e.parent_id!)})
                    </option>
                  ))}
                </select>
              </div>

              <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
                {conversations.map((c) => {
                  const active = vue?.type === "parent" && vue.id === c.idParent;
                  return (
                    <li key={c.idParent}>
                      <button
                        onClick={() => setVue({ type: "parent", id: c.idParent })}
                        className={`block w-full px-4 py-3 text-left transition ${active ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`truncate text-sm ${c.nonLus > 0 ? "font-bold text-slate-900" : "font-medium text-slate-800"}`}>
                            {nomParent(c.idParent)}
                          </span>
                          {c.nonLus > 0 ? (
                            <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                              {c.nonLus} non lu{c.nonLus > 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">{formaterMoment(c.dernier.created_at)}</span>
                          )}
                        </div>
                        <p className="truncate text-xs text-slate-400">Parent de {enfantsDe(c.idParent) || "—"}</p>
                        <p className={`mt-1 truncate text-sm ${c.nonLus > 0 ? "text-slate-800" : "text-slate-500"}`}>
                          {c.dernier.expediteur_id === monId ? "Vous : " : ""}
                          {c.dernier.contenu}
                        </p>
                      </button>
                    </li>
                  );
                })}
                {conversations.length === 0 && (
                  <li className="p-4 text-sm text-slate-500">Aucune conversation. Choisissez un élève ci-dessus pour écrire à son parent.</li>
                )}
              </ul>
            </>
          ) : (
            <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
              {classes.map((classe) => {
                const active = vue?.type === "classe" && vue.id === classe.id;
                const nb = messages.filter((m) => m.classe_id === classe.id).length;
                return (
                  <li key={classe.id}>
                    <button
                      onClick={() => setVue({ type: "classe", id: classe.id })}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                        active ? "bg-indigo-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="font-medium text-slate-800">{nomClasse(classe.id)}</span>
                      <span className="text-xs text-slate-400">
                        {nb} message{nb > 1 ? "s" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* =============== Colonne de droite : conversation =============== */}
        {vue ? (
          <Conversation
            key={`${vue.type}-${vue.id}`}
            vue={vue}
            monId={monId}
            fil={filConversation}
            titre={vue.type === "parent" ? nomParent(vue.id) : `Classe ${nomClasse(vue.id)}`}
            sousTitre={
              vue.type === "parent"
                ? `Parent de ${enfantsDe(vue.id) || "—"}`
                : `Message visible par les parents de ${eleves.filter((e) => e.classe_id === vue.id).length} élève(s)`
            }
            onEnvoye={charger}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            Choisissez une conversation à gauche.
          </div>
        )}
      </div>
    </>
  );
}

// =====================================================================
// Une conversation : fil des messages + zone d'écriture
// =====================================================================
function Conversation({
  vue,
  monId,
  fil,
  titre,
  sousTitre,
  onEnvoye,
}: {
  vue: NonNullable<Vue>;
  monId: string;
  fil: Message[];
  titre: string;
  sousTitre: string;
  onEnvoye: () => void;
}) {
  const [texte, setTexte] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [info, setInfo] = useState("");
  const basDuFil = useRef<HTMLDivElement>(null);

  // Mode "sélection" pour supprimer un ou plusieurs messages
  const [modeSelection, setModeSelection] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());

  function basculer(id: string) {
    setSelection((actuelle) => {
      const nouvelle = new Set(actuelle);
      if (nouvelle.has(id)) nouvelle.delete(id);
      else nouvelle.add(id);
      return nouvelle;
    });
  }

  function quitterSelection() {
    setModeSelection(false);
    setSelection(new Set());
  }

  async function supprimer(ids: string[]) {
    if (ids.length === 0) return;
    const question =
      ids.length === fil.length
        ? "Supprimer toute la conversation ? Les messages disparaîtront aussi de l'application des parents."
        : `Supprimer ${ids.length} message${ids.length > 1 ? "s" : ""} ? ${ids.length > 1 ? "Ils disparaîtront" : "Il disparaîtra"} aussi de l'application des parents.`;
    if (!confirm(question)) return;
    const { error } = await db().from("messages").delete().in("id", ids);
    if (error) {
      setInfo(messageErreur(error));
      return;
    }
    setInfo(`${ids.length} message${ids.length > 1 ? "s supprimés" : " supprimé"}.`);
    quitterSelection();
    onEnvoye(); // recharge la liste
  }

  // Descend automatiquement au dernier message
  useEffect(() => {
    basDuFil.current?.scrollIntoView({ behavior: "smooth" });
  }, [fil.length]);

  async function envoyer() {
    const contenu = texte.trim();
    if (!contenu) return;
    setEnCours(true);
    setInfo("");

    // 1) Enregistrement du message
    const { data, error } = await db()
      .from("messages")
      .insert({
        expediteur_id: monId,
        contenu,
        destinataire_id: vue.type === "parent" ? vue.id : null,
        classe_id: vue.type === "classe" ? vue.id : null,
      })
      .select("id")
      .single();

    if (error || !data) {
      setInfo(messageErreur(error));
      setEnCours(false);
      return;
    }
    setTexte("");
    setEnCours(false);
    onEnvoye();

    // 2) Notification push aux parents concernés (en arrière-plan)
    const resultat = await db().functions.invoke("notifier-message", { body: { message_id: data.id } });
    if (resultat.error) {
      setInfo("Message envoyé, mais la notification n'a pas pu partir : " + (await messageErreurFonction(resultat.error)));
    } else if (resultat.data.sans_application > 0) {
      const n = resultat.data.sans_application;
      setInfo(`Message envoyé. ${n} parent${n > 1 ? "s n'ont" : " n'a"} pas encore l'application (il${n > 1 ? "s le verront" : " le verra"} en l'installant).`);
    }
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800">{titre}</p>
          <p className="text-xs text-slate-500">{sousTitre}</p>
        </div>
        {fil.length > 0 &&
          (modeSelection ? (
            <div className="flex shrink-0 gap-2">
              <Bouton
                variante="secondaire"
                onClick={() => setSelection(selection.size === fil.length ? new Set() : new Set(fil.map((m) => m.id)))}
              >
                {selection.size === fil.length ? "Tout désélectionner" : "Tout sélectionner"}
              </Bouton>
              <Bouton variante="danger" disabled={selection.size === 0} onClick={() => supprimer([...selection])}>
                Supprimer ({selection.size})
              </Bouton>
              <Bouton variante="secondaire" onClick={quitterSelection}>
                Annuler
              </Bouton>
            </div>
          ) : (
            <Bouton variante="secondaire" className="shrink-0" onClick={() => setModeSelection(true)}>
              🗑 Supprimer des messages
            </Bouton>
          ))}
      </header>

      {/* Fil des messages */}
      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-6 py-4">
        {fil.map((m) => {
          const deMoi = m.expediteur_id === monId;
          const choisi = selection.has(m.id);
          return (
            <div
              key={m.id}
              onClick={modeSelection ? () => basculer(m.id) : undefined}
              className={`flex items-center gap-3 ${deMoi ? "justify-end" : "justify-start"} ${
                modeSelection ? "cursor-pointer rounded-lg px-2 py-1 hover:bg-slate-100" : ""
              } ${choisi ? "bg-red-50" : ""}`}
            >
              {modeSelection && (
                <input
                  type="checkbox"
                  checked={choisi}
                  onChange={() => basculer(m.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 accent-red-600"
                  aria-label="Sélectionner ce message"
                />
              )}
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                  deMoi ? "rounded-br-sm bg-indigo-600 text-white" : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
                }`}
              >
                <p className="whitespace-pre-line break-words">{m.contenu}</p>
                <p className={`mt-1 text-right text-[11px] ${deMoi ? "text-indigo-200" : "text-slate-400"}`}>
                  {formaterMoment(m.created_at)}
                  {deMoi && vue.type === "parent" && (m.lu ? " · Lu" : " · Envoyé")}
                </p>
              </div>
            </div>
          );
        })}
        {fil.length === 0 && <p className="pt-8 text-center text-sm text-slate-400">Aucun message pour le moment.</p>}
        <div ref={basDuFil} />
      </div>

      {/* Zone d'écriture */}
      <div className="border-t border-slate-200 p-4">
        {info && <p className="mb-2 text-xs text-slate-500">{info}</p>}
        <div className="flex items-end gap-3">
          <textarea
            className={`${styleChamp} resize-none`}
            rows={2}
            maxLength={4000}
            placeholder="Écrire un message... (Entrée pour envoyer, Maj + Entrée pour aller à la ligne)"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                envoyer();
              }
            }}
          />
          <Bouton onClick={envoyer} disabled={enCours || !texte.trim()}>
            Envoyer
          </Bouton>
        </div>
      </div>
    </section>
  );
}
