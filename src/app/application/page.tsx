// Page publique de téléchargement de l'application Android des parents.
// C'est ce lien que l'enseignante envoie aux parents (WhatsApp, SMS, Facebook...).
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Application parents – Learn English With Mrs Ilhem",
  description: "Téléchargez l'application des parents : absences, documents, paiements et messages.",
};

// Adresse permanente du fichier .apk : dernière release du dépôt public GitHub
// « developsteg/mrs-ilhem-apk » (gratuit, sans limite de téléchargements).
// Nouvelle version : sur GitHub, Releases > Edit > remplacer le fichier
// « learn-english-mrs-ilhem.apk » (même nom, donc même adresse).
const CHEMIN_APK = "github.com/developsteg/mrs-ilhem-apk/releases/latest/download/learn-english-mrs-ilhem.apk";
const LIEN_APK = `https://${CHEMIN_APK}`;
const SITE = "learn-english-with-mrs-ilhem.netlify.app";

// Navigateurs intégrés aux applications (Facebook, Messenger, Instagram, TikTok...) :
// ils ne savent pas télécharger un fichier .apk. On fait alors ouvrir le
// téléchargement directement dans Chrome grâce à un lien « intent » Android.
function estNavigateurIntegre(ua: string) {
  return /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|musical_ly|TikTok|Snapchat/i.test(ua);
}

// Lien qui demande à Android d'ouvrir le téléchargement dans Chrome.
// Si Chrome n'est pas installé, on revient sur cette page (avec les explications).
const LIEN_CHROME =
  `intent://${CHEMIN_APK}#Intent;scheme=https;package=com.android.chrome;` +
  `S.browser_fallback_url=${encodeURIComponent(`https://${SITE}/application?externe=1`)};end`;

const etapes = [
  {
    titre: "Téléchargez l'application",
    texte:
      "Appuyez sur le bouton ci-dessus depuis votre téléphone Android, le téléchargement démarre. Ouvrez ensuite le fichier téléchargé (dans les notifications ou dans « Téléchargements »).",
  },
  {
    titre: "Autorisez l'installation",
    texte:
      "Android demande d'autoriser l'installation depuis le navigateur (« applications inconnues ») : appuyez sur « Paramètres », activez l'autorisation, puis revenez en arrière.",
  },
  {
    titre: "Installez",
    texte:
      "Appuyez sur « Installer ». L'icône « Learn English With Mrs Ilhem » apparaît sur l'écran de votre téléphone, comme n'importe quelle application.",
  },
  {
    titre: "Demandez votre inscription",
    texte:
      "Ouvrez l'application, appuyez sur « Demande d'inscription » et remplissez le formulaire. Vous aurez accès à tout dès que Mrs Ilhem aura validé votre demande.",
  },
];

export default async function PageApplication() {
  const ua = (await headers()).get("user-agent") ?? "";
  const integre = estNavigateurIntegre(ua);
  const android = /Android/i.test(ua);
  const iphone = /iPhone|iPad|iPod/i.test(ua);
  // Depuis Facebook & co sur Android : le bouton ouvre Chrome
  const lienBouton = integre && android ? LIEN_CHROME : LIEN_APK;

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <div className="text-center">
        <Image src="/logo.png" alt="Logo Learn English With Mrs Ilhem" width={120} height={120} priority className="mx-auto" />
        <h1 className="mt-4 text-2xl font-bold text-indigo-700">Learn English With Mrs Ilhem</h1>
        <p className="mt-1 text-or-700">Application des parents</p>
        <p className="mx-auto mt-4 max-w-md text-slate-600">
          Recevez les notifications d&apos;absence, consultez les documents, les reçus de paiement et échangez avec
          l&apos;enseignante.
        </p>

        {iphone ? (
          <>
            {/* iPhone : l'application .apk ne s'installe pas, on propose l'espace parents web */}
            <a
              href="/parents"
              className="mt-6 inline-block rounded-xl bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Ouvrir l&apos;espace parents
            </a>
            <p className="mt-2 text-xs text-slate-400">Version iPhone (sans téléchargement)</p>
            <div className="mx-auto mt-6 max-w-md rounded-xl border border-or-300 bg-or-100 p-4 text-left text-sm text-slate-700">
              <p className="font-semibold text-indigo-700">Sur iPhone</p>
              <p className="mt-1">
                Ouvrez ce lien dans <b>Safari</b> (depuis Facebook : bouton <b>•••</b> puis{" "}
                <b>« Ouvrir dans Safari »</b>). Dans l&apos;espace parents, appuyez sur <b>Partager</b> puis{" "}
                <b>« Sur l&apos;écran d&apos;accueil »</b> : il s&apos;ouvrira comme une application.
              </p>
            </div>
          </>
        ) : (
          <>
            <a
              href={lienBouton}
              className="mt-6 inline-block rounded-xl bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Télécharger l&apos;application
            </a>
            <p className="mt-2 text-xs text-slate-400">Pour téléphones Android</p>

            {integre && (
              <div className="mx-auto mt-6 max-w-md rounded-xl border border-or-300 bg-or-100 p-4 text-left text-sm text-slate-700">
                <p className="font-semibold text-indigo-700">Vous êtes dans Facebook / Messenger</p>
                <p className="mt-1">
                  Le téléchargement s&apos;ouvre dans <b>Chrome</b> : si Facebook demande « Vous quittez notre
                  application », appuyez sur <b>Continuer</b>.
                </p>
                <p className="mt-2">
                  Si rien ne se passe : appuyez sur les <b>trois points ⋮</b> en haut à droite, puis sur{" "}
                  <b>« Ouvrir dans le navigateur »</b>, et appuyez à nouveau sur « Télécharger l&apos;application ».
                </p>
              </div>
            )}

            <p className="mt-4 text-sm text-slate-500">
              Vous avez un iPhone ?{" "}
              <a href="/parents" className="font-semibold text-indigo-700 underline">
                Ouvrez l&apos;espace parents
              </a>
            </p>
          </>
        )}
      </div>

      {!iphone && (
      <ol className="mt-10 space-y-4">
        {etapes.map((etape, i) => (
          <li key={etape.titre} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-or-100 font-bold text-or-700">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold text-slate-800">{etape.titre}</p>
              <p className="mt-1 text-sm text-slate-600">{etape.texte}</p>
            </div>
          </li>
        ))}
      </ol>
      )}

      <p className="mt-8 text-center text-sm text-slate-500">
        Une question ? Contactez Mrs Ilhem au 96 487 105.
        <br />
        <Link href="/confidentialite" className="underline">
          Politique de confidentialité
        </Link>
      </p>
    </main>
  );
}
