"use client";
// Formulaire "Prévenir les parents" (page Emploi du temps) :
// changement d'emploi du temps, séance de rattrapage ou séance annulée.
// Envoie un message à toute la classe (visible dans l'onglet Messages de
// l'application) + une notification push sur le téléphone des parents.
import { useState } from "react";
import { creerClientSupabase } from "@/lib/supabase/client";
import { messageErreur, messageErreurFonction } from "@/lib/erreurs";
import { Alerte, Bouton, Carte, Champ, Liste, styleChamp } from "@/components/ui";

export type TypeAnnonce = "changement" | "rattrapage" | "annulation";

const TITRES: Record<TypeAnnonce, string> = {
  changement: "Changement d'emploi du temps",
  rattrapage: "Séance de rattrapage",
  annulation: "Séance annulée",
};

const ICONES: Record<TypeAnnonce, string> = {
  changement: "📅",
  rattrapage: "📚",
  annulation: "⚠️",
};

// "2026-10-02" -> "jeudi 2 octobre"
function dateEnToutesLettres(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default function PrevenirParents({
  classeId,
  nomClasse,
  typeInitial = "changement",
  detailsInitiaux = "",
  onFermer,
}: {
  classeId: string;
  nomClasse: string;
  typeInitial?: TypeAnnonce;
  detailsInitiaux?: string; // ex : description du créneau qui vient d'être modifié
  onFermer: () => void;
}) {
  const [type, setType] = useState<TypeAnnonce>(typeInitial);
  const [date, setDate] = useState("");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [precisions, setPrecisions] = useState(detailsInitiaux);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  // Texte du message envoyé aux parents (construit à partir du formulaire)
  const lignes = [`${ICONES[type]} ${TITRES[type]} – classe ${nomClasse}`];
  if (date) {
    const horaire = debut && fin ? ` de ${debut} à ${fin}` : debut ? ` à ${debut}` : "";
    lignes.push(`${type === "annulation" ? "La séance du" : "Le"} ${dateEnToutesLettres(date)}${horaire}.`);
  }
  if (precisions.trim()) lignes.push(precisions.trim());
  const texte = lignes.join("\n");

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setSucces("");

    if (type !== "changement" && !date) return setErreur("Indiquez la date de la séance.");
    if (debut && fin && fin <= debut) return setErreur("L'heure de fin doit être après l'heure de début.");
    if (type === "changement" && !date && !precisions.trim()) {
      return setErreur("Décrivez le changement (ou indiquez une date).");
    }
    if (!confirm(`Envoyer ce message à tous les parents de la classe ${nomClasse} ?\n\n${texte}`)) return;

    setEnCours(true);
    const db = creerClientSupabase();
    const { data: moi } = await db.auth.getUser();

    // 1) Message à la classe (enregistré dans la messagerie)
    const { data, error } = await db
      .from("messages")
      .insert({ expediteur_id: moi.user?.id, contenu: texte, classe_id: classeId, destinataire_id: null })
      .select("id")
      .single();
    if (error || !data) {
      setEnCours(false);
      return setErreur(messageErreur(error));
    }

    // 2) Notification push sur le téléphone des parents
    const resultat = await db.functions.invoke("notifier-message", {
      body: { message_id: data.id, titre: TITRES[type] },
    });
    setEnCours(false);

    if (resultat.error) {
      setSucces(
        "Message envoyé à la classe, mais la notification n'a pas pu partir : " +
          (await messageErreurFonction(resultat.error))
      );
    } else {
      const { envoyees = 0, sans_application = 0 } = resultat.data ?? {};
      setSucces(
        `Message envoyé à la classe ${nomClasse}. Notification reçue sur ${envoyees} téléphone${envoyees > 1 ? "s" : ""}` +
          (sans_application > 0
            ? ` (${sans_application} parent${sans_application > 1 ? "s n'ont" : " n'a"} pas encore l'application).`
            : ".")
      );
    }
  }

  return (
    <Carte titre="📢 Prévenir les parents de la classe">
      {succes ? (
        <div className="space-y-4">
          <Alerte type="succes">{succes}</Alerte>
          <Bouton variante="secondaire" onClick={onFermer}>
            Fermer
          </Bouton>
        </div>
      ) : (
        <form onSubmit={envoyer} className="space-y-4">
          {erreur && <Alerte type="erreur">{erreur}</Alerte>}
          <div className="grid grid-cols-4 gap-4">
            <Liste label="Type" value={type} onChange={(e) => setType(e.target.value as TypeAnnonce)}>
              <option value="changement">{TITRES.changement}</option>
              <option value="rattrapage">{TITRES.rattrapage}</option>
              <option value="annulation">{TITRES.annulation}</option>
            </Liste>
            <Champ
              label={type === "changement" ? "Date (facultatif)" : "Date"}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Champ label="Début" type="time" value={debut} onChange={(e) => setDebut(e.target.value)} />
            <Champ label="Fin" type="time" value={fin} onChange={(e) => setFin(e.target.value)} />
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Précisions</span>
            <textarea
              className={styleChamp}
              rows={3}
              maxLength={1000}
              placeholder="ex : Cause : absence de l'enseignante. La séance est déplacée au samedi."
              value={precisions}
              onChange={(e) => setPrecisions(e.target.value)}
            />
          </label>

          {/* Aperçu de ce que les parents recevront */}
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Aperçu du message</p>
            <p className="whitespace-pre-line rounded-lg border border-or-300 bg-or-100 px-4 py-3 text-sm text-slate-800">
              {texte}
            </p>
          </div>

          <div className="flex gap-2">
            <Bouton type="submit" disabled={enCours}>
              {enCours ? "Envoi..." : "Envoyer aux parents"}
            </Bouton>
            <Bouton type="button" variante="secondaire" onClick={onFermer}>
              Annuler
            </Bouton>
          </div>
        </form>
      )}
    </Carte>
  );
}
