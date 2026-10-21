// Espace parents (version web) : utilisé surtout par les parents qui ont un
// iPhone (l'application Android .apk ne s'installe pas sur iPhone), mais il
// fonctionne sur n'importe quel téléphone ou ordinateur.
import type { Metadata, Viewport } from "next";
import { FournisseurSessionParent } from "@/lib/parents/session";

export const metadata: Metadata = {
  title: "Espace parents – Learn English With Mrs Ilhem",
  description: "Absences, emploi du temps, documents, messages et paiements de votre enfant.",
  // Ajouté à l'écran d'accueil de l'iPhone : s'ouvre comme une application
  appleWebApp: { capable: true, title: "Mrs Ilhem", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // utilise tout l'écran de l'iPhone (encoche comprise)
  themeColor: "#122a4e",
};

export default function LayoutParents({ children }: { children: React.ReactNode }) {
  return <FournisseurSessionParent>{children}</FournisseurSessionParent>;
}
