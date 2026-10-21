"use client";
// Conseil affiché sur iPhone (dans Safari) : ajouter l'espace parents à
// l'écran d'accueil pour l'ouvrir comme une application.
// Masqué une fois ajouté, ou si le parent le ferme.
import { useEffect, useState } from "react";

const CLE = "parents-conseil-ecran-accueil-ferme";

export default function AjouterEcranAccueil() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const iphone = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    // Déjà ouvert depuis l'écran d'accueil ?
    const installe =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let ferme = false;
    try {
      ferme = localStorage.getItem(CLE) === "1";
    } catch {
      // stockage indisponible (navigation privée) : on affiche le conseil
    }
    setVisible(iphone && !installe && !ferme);
  }, []);

  if (!visible) return null;

  function fermer() {
    try {
      localStorage.setItem(CLE, "1");
    } catch {
      // sans importance
    }
    setVisible(false);
  }

  return (
    <div className="rounded-2xl border border-or-300 bg-or-100 p-4 text-sm text-slate-700">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-indigo-700">Installez l&apos;espace parents sur votre iPhone</p>
        <button type="button" onClick={fermer} aria-label="Fermer" className="text-lg leading-none text-slate-500">
          ×
        </button>
      </div>
      <p className="mt-1">
        Dans Safari, appuyez sur le bouton <b>Partager</b> (le carré avec une flèche vers le haut), puis sur{" "}
        <b>« Sur l&apos;écran d&apos;accueil »</b>. L&apos;icône apparaîtra comme une application.
      </p>
    </div>
  );
}
