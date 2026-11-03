"use client";
// Conseil pour ouvrir l'espace parents comme une application, sans la télécharger :
//  - Android (Chrome) : bouton « Installer » (l'écran d'accueil reçoit une icône)
//  - iPhone (Safari)  : explication « Partager > Sur l'écran d'accueil »
// Masqué une fois installé, ou si le parent le ferme.
import { useEffect, useState } from "react";

const CLE = "parents-conseil-ecran-accueil-ferme";

// Événement non standard envoyé par Chrome quand l'installation est possible
type EvenementInstallation = Event & { prompt: () => Promise<void> };

export default function AjouterEcranAccueil() {
  const [iphone, setIphone] = useState(false);
  const [installation, setInstallation] = useState<EvenementInstallation | null>(null);
  const [ferme, setFerme] = useState(true);

  useEffect(() => {
    // Déjà ouvert depuis l'écran d'accueil ?
    const installe =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dejaFerme = false;
    try {
      dejaFerme = localStorage.getItem(CLE) === "1";
    } catch {
      // stockage indisponible (navigation privée) : on affiche le conseil
    }
    setFerme(installe || dejaFerme);
    setIphone(/iPhone|iPad|iPod/i.test(navigator.userAgent));

    // Chrome : on garde l'événement pour l'utiliser quand le parent appuie sur « Installer »
    function surProposition(e: Event) {
      e.preventDefault();
      setInstallation(e as EvenementInstallation);
    }
    function surInstallation() {
      setInstallation(null);
      setFerme(true);
    }
    window.addEventListener("beforeinstallprompt", surProposition);
    window.addEventListener("appinstalled", surInstallation);
    return () => {
      window.removeEventListener("beforeinstallprompt", surProposition);
      window.removeEventListener("appinstalled", surInstallation);
    };
  }, []);

  if (ferme || (!iphone && !installation)) return null;

  function masquer() {
    try {
      localStorage.setItem(CLE, "1");
    } catch {
      // sans importance
    }
    setFerme(true);
  }

  async function installer() {
    if (!installation) return;
    await installation.prompt();
    setInstallation(null);
  }

  return (
    <div className="rounded-2xl border border-or-300 bg-or-100 p-4 text-sm text-slate-700">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-indigo-700">
          {iphone ? "Installez l'espace parents sur votre iPhone" : "Installez l'espace parents sur votre téléphone"}
        </p>
        <button type="button" onClick={masquer} aria-label="Fermer" className="text-lg leading-none text-slate-500">
          ×
        </button>
      </div>
      {iphone ? (
        <p className="mt-1">
          Dans Safari, appuyez sur le bouton <b>Partager</b> (le carré avec une flèche vers le haut), puis sur{" "}
          <b>« Sur l&apos;écran d&apos;accueil »</b>. L&apos;icône apparaîtra comme une application.
        </p>
      ) : (
        <>
          <p className="mt-1">Une icône sera ajoutée sur votre écran d&apos;accueil, sans téléchargement.</p>
          <button
            type="button"
            onClick={installer}
            className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white"
          >
            Installer
          </button>
        </>
      )}
    </div>
  );
}
