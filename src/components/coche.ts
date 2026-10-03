/**
 * Le tracé de la coche, dans une boîte de 24 — **le seul tracé de coche du dépôt**, qui n'a pas
 * d'icônes. Deux surfaces le lisent : la pastille de l'action engagée (`PastilleEngagee`) et la case
 * d'une puce à cocher (`Chip`, 03/10/2026). Un module neutre, comme `cadre-du-champ.ts` : la puce du
 * questionnaire n'a pas à importer un composant du plan pour le trouver, et une copie laisserait
 * diverger la marque du geste le plus important du produit et celle d'une réponse cochée.
 */
export const TRACE_DE_LA_COCHE = 'M5 13l4 4L19 7';
