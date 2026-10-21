// Politique de confidentialité de l'application des parents.
// Page publique (accessible sans connexion) : son adresse est demandée par le Play Store.
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Politique de confidentialité – Learn English With Mrs Ilhem",
};

// Adresse à laquelle les parents peuvent écrire (à modifier si besoin)
const EMAIL_CONTACT = "ilhem.belhajibrahim@gmail.com";
const DATE_MISE_A_JOUR = "26 septembre 2026";

export default function Confidentialite() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center gap-4">
        <Image src="/logo.png" alt="" width={64} height={64} className="rounded-lg" />
        <div>
          <h1 className="text-2xl font-bold text-indigo-700">Politique de confidentialité</h1>
          <p className="text-sm text-slate-500">Learn English With Mrs Ilhem : mise à jour le {DATE_MISE_A_JOUR}</p>
        </div>
      </div>

      <div className="space-y-6 leading-relaxed text-slate-700 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-indigo-700 [&_ul]:list-disc [&_ul]:pl-6">
        <section>
          <h2>Qui sommes-nous ?</h2>
          <p>
            L&apos;application « Learn English With Mrs Ilhem » permet aux parents d&apos;élèves de suivre les cours de
            soutien donnés par Mrs Ilhem : absences, documents, paiements et messages. Elle est réservée aux
            familles inscrites : les comptes sont créés par l&apos;enseignante, il n&apos;est pas possible de
            s&apos;inscrire soi-même.
          </p>
        </section>

        <section>
          <h2>Données collectées</h2>
          <ul>
            <li>Parent : nom, adresse email, numéro de téléphone.</li>
            <li>Élève : nom, prénom, niveau et classe.</li>
            <li>Suivi scolaire : emploi du temps, absences, programmes et documents partagés.</li>
            <li>Paiements : montants, dates et reçus (aucune carte bancaire n&apos;est enregistrée).</li>
            <li>Messages échangés entre le parent et l&apos;enseignante.</li>
            <li>Un identifiant technique du téléphone, uniquement pour envoyer les notifications.</li>
          </ul>
          <p className="mt-2">Aucune donnée de localisation, aucun contact et aucune photo du téléphone ne sont lus.</p>
        </section>

        <section>
          <h2>Utilisation des données</h2>
          <p>
            Ces données servent uniquement au suivi des cours : informer le parent d&apos;une absence, partager des
            documents, délivrer les reçus de paiement et permettre les échanges avec l&apos;enseignante. Il n&apos;y a
            ni publicité, ni revente, ni partage avec d&apos;autres entreprises.
          </p>
        </section>

        <section>
          <h2>Stockage et sécurité</h2>
          <p>
            Les données sont hébergées par Supabase (base de données sécurisée) et transmises de façon chiffrée
            (HTTPS). Chaque parent ne peut voir que les informations de ses propres enfants. Les documents sont
            stockés dans un espace privé, accessible uniquement par des liens temporaires. Les notifications sont
            envoyées par le service Expo (Google Firebase sur Android).
          </p>
        </section>

        <section>
          <h2>Durée de conservation</h2>
          <p>
            Les données sont conservées tant que l&apos;élève suit les cours, puis supprimées sur demande ou au plus
            tard un an après la fin des cours.
          </p>
        </section>

        <section>
          <h2>Vos droits et suppression du compte</h2>
          <p>
            Vous pouvez demander à consulter, corriger ou supprimer vos données et votre compte à tout moment, en
            écrivant à <a className="font-medium text-indigo-600 underline" href={`mailto:${EMAIL_CONTACT}`}>{EMAIL_CONTACT}</a>{" "}
            depuis l&apos;adresse email de votre compte. La suppression est faite sous 30 jours et concerne toutes
            les données listées ci-dessus.
          </p>
        </section>

        <section>
          <h2>Enfants</h2>
          <p>
            L&apos;application est destinée aux parents, pas aux enfants. Les informations sur les élèves sont
            saisies par l&apos;enseignante et consultées uniquement par leurs parents.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Pour toute question : <a className="font-medium text-indigo-600 underline" href={`mailto:${EMAIL_CONTACT}`}>{EMAIL_CONTACT}</a>
          </p>
        </section>
      </div>
    </main>
  );
}
