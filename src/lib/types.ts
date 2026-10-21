// Types TypeScript qui correspondent aux tables Supabase.

export type Niveau = {
  id: string;
  nom: string;
  ordre: number;
};

export type Classe = {
  id: string;
  nom: string;
  niveau_id: string;
};

export type Profil = {
  id: string;
  nom: string;
  telephone: string | null;
  role: "enseignante" | "parent";
  statut: "en_attente" | "valide" | "refuse";
  email: string | null;
  enfant_demande: string | null; // enfant indiqué par le parent à l'inscription
  created_at: string;
};

export type Eleve = {
  id: string;
  nom: string;
  prenom: string;
  classe_id: string | null;
  parent_id: string | null;
};

export type Creneau = {
  id: string;
  classe_id: string;
  jour: number; // 1 = lundi ... 7 = dimanche
  heure_debut: string; // "14:00:00"
  heure_fin: string;
};

export type Programme = {
  id: string;
  classe_id: string;
  titre: string;
  description: string | null;
  date_prevue: string | null; // "2026-10-15"
  statut: "prevu" | "fait";
};

export type Message = {
  id: string;
  expediteur_id: string;
  destinataire_id: string | null;
  classe_id: string | null;
  contenu: string;
  lu: boolean;
  created_at: string;
};

export type DocumentPartage = {
  id: string;
  titre: string;
  fichier_chemin: string; // chemin dans le bucket "documents"
  type: string | null; // ex : "application/pdf"
  taille: number | null; // en octets
  classe_id: string | null;
  eleve_id: string | null;
  created_at: string;
};

export type Paiement = {
  id: string;
  eleve_id: string;
  montant: number;
  mois: string; // 1er jour du mois payé : "2026-10-01"
  date_paiement: string; // "2026-10-03"
  mode: "especes" | "virement" | "cheque";
  numero_recu: string; // "R-00001"
  recu_chemin: string | null; // PDF dans le bucket "documents" (recus/<eleve_id>/...)
  created_at: string;
};
