// Mise en page de tout l'espace enseignante (menu à gauche + contenu).
// Vérifie côté serveur que la personne connectée a bien le rôle "enseignante".
import { redirect } from "next/navigation";
import MenuLateral from "@/components/MenuLateral";
import { creerClientServeur } from "@/lib/supabase/server";

export default async function LayoutEspace({ children }: { children: React.ReactNode }) {
  const supabase = await creerClientServeur();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profil } = await supabase
    .from("profiles")
    .select("nom, role")
    .eq("id", user.id)
    .single();

  // Un parent va dans son espace ; un compte sans profil n'a pas accès au dashboard
  if (profil?.role === "parent") redirect("/parents");
  if (profil?.role !== "enseignante") redirect("/connexion?erreur=acces");

  return (
    <div className="min-h-screen">
      <MenuLateral nomEnseignante={profil.nom || user.email || ""} idEnseignante={user.id} />
      <main className="ml-64 p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
