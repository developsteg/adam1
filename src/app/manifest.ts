// Manifeste web : permet d'ajouter l'espace parents à l'écran d'accueil
// du téléphone (iPhone ou Android) et de l'ouvrir comme une application.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Learn English With Mrs Ilhem – Parents",
    short_name: "Mrs Ilhem",
    description: "Absences, emploi du temps, documents, messages et paiements de votre enfant.",
    start_url: "/parents",
    scope: "/parents",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#122a4e",
    lang: "fr",
    icons: [{ src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
