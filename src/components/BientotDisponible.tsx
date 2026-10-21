// Page provisoire pour les modules qui seront construits dans les prochaines étapes.
import { Carte, EnTetePage } from "@/components/ui";

export default function BientotDisponible({ titre }: { titre: string }) {
  return (
    <>
      <EnTetePage titre={titre} />
      <Carte>
        <p className="text-slate-500">Ce module sera bientôt disponible.</p>
      </Carte>
    </>
  );
}
