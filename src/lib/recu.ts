// Génération du reçu de paiement en PDF (dans le navigateur, avec pdf-lib).
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type InfosRecu = {
  numero: string; // "R-00001"
  enseignante: string; // nom de l'institutrice
  eleve: string; // "Adam Marzougui"
  classe: string; // "5ème – Groupe 1"
  parent: string;
  mois: string; // "Octobre 2026"
  montant: string; // "50,000 DT"
  mode: string; // "Espèces"
  datePaiement: string; // "03/10/2026"
  logo?: Uint8Array; // logo au format JPEG (public/logo-recu.jpg)
};

// Les polices standard du PDF ne connaissent que l'alphabet latin :
// on remplace les espaces spéciaux et on retire les caractères inconnus.
function texteCompatible(texte: string) {
  return texte
    .replace(/[\u202f\u00a0]/g, " ")
    .replace(/[^\x20-\x7E\u00A0-\u00FF–—‘’“”…€œŒ]/g, "?");
}

export async function genererRecuPdf(infos: InfosRecu): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Reçu ${infos.numero}`);
  const page = pdf.addPage([595, 842]); // format A4 (en points)
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const gras = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Couleurs du logo : bleu marine et doré
  const indigo = rgb(0.07, 0.165, 0.306); // #122A4E
  const dore = rgb(0.765, 0.608, 0.337); // #C39B56
  const grisFonce = rgb(0.2, 0.25, 0.33);
  const gris = rgb(0.45, 0.5, 0.58);
  const ligne = rgb(0.89, 0.91, 0.94);

  const ecrire = (texte: string, x: number, y: number, taille: number, police = normal, couleur = grisFonce) =>
    page.drawText(texteCompatible(texte), { x, y, size: taille, font: police, color: couleur });

  // ---------- En-tête : logo + nom + filet doré ----------
  let xTexte = 50;
  if (infos.logo) {
    const logo = await pdf.embedJpg(infos.logo);
    page.drawImage(logo, { x: 50, y: 742, width: 80, height: 80 });
    xTexte = 145;
  }
  ecrire(infos.enseignante, xTexte, 790, 20, gras, indigo);
  ecrire("Learn English with Mrs Ilhem – Cours de soutien", xTexte, 770, 11, normal, gris);
  ecrire("Tél. & WhatsApp : 96 487 105", xTexte, 754, 10, normal, dore);
  page.drawRectangle({ x: 50, y: 728, width: 495, height: 2, color: dore });

  ecrire("REÇU DE PAIEMENT", 50, 692, 22, gras, indigo);
  ecrire(`N° ${infos.numero}`, 50, 668, 13, gras, dore);
  ecrire(`Date : ${infos.datePaiement}`, 400, 668, 11, normal, gris);

  // ---------- Détails ----------
  const lignes: [string, string][] = [
    ["Élève", infos.eleve],
    ["Classe", infos.classe],
    ["Parent", infos.parent],
    ["Mois payé", infos.mois],
    ["Mode de paiement", infos.mode],
  ];
  let y = 615;
  for (const [libelle, valeur] of lignes) {
    ecrire(libelle, 50, y, 11, normal, gris);
    ecrire(valeur, 200, y, 12, gras);
    page.drawLine({ start: { x: 50, y: y - 12 }, end: { x: 545, y: y - 12 }, thickness: 1, color: ligne });
    y -= 40;
  }

  // ---------- Montant ----------
  page.drawRectangle({ x: 50, y: y - 45, width: 495, height: 60, color: rgb(0.93, 0.95, 0.98) });
  page.drawRectangle({ x: 50, y: y - 45, width: 4, height: 60, color: dore });
  ecrire("Montant reçu", 70, y - 20, 12, normal, gris);
  const montant = texteCompatible(infos.montant);
  const largeur = gras.widthOfTextAtSize(montant, 22);
  page.drawText(montant, { x: 525 - largeur, y: y - 24, size: 22, font: gras, color: indigo });

  // ---------- Signature et pied de page ----------
  ecrire("Signature de l'enseignante", 360, y - 110, 10, normal, gris);
  page.drawLine({ start: { x: 360, y: y - 160 }, end: { x: 545, y: y - 160 }, thickness: 1, color: ligne });

  ecrire(
    `Reçu généré électroniquement le ${new Date().toLocaleDateString("fr-FR")}. Merci pour votre confiance.`,
    50,
    50,
    9,
    normal,
    gris
  );

  return pdf.save();
}
