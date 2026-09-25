/**
 * Ce qu'une ligne du choix du canal de rappel **montre** comme choisi — module pur, lu par
 * `LigneDeCanal` (24/09/2026, `v1-29`).
 *
 * **Une option désactivée ne se rend jamais comme choisie.** Sur « Toi », sans compte, « Par email »
 * s'affichait grisée **et** cochée : la préférence en base vaut `email` par défaut
 * (`20260907230000_rappels_canal.sql`), `lignesDeReglage` en fait la ligne `choisi`, et l'écran la
 * peignait telle quelle — fond teinté, bordure d'accent, graisse 600 sous l'opacité de l'inactivité,
 * et `aria-checked` vrai pour un lecteur d'écran. Elle se lisait « c'est ton réglage » sur un canal
 * qui ne peut rien envoyer.
 *
 * **La table de vérité tranche ce cas, et elle ne dit pas « email »** : préférence `email` sans
 * adresse utilisable, le canal effectif est `aucun` (`canalEffectif`, `src/types/rappels.ts`). Rien
 * ne part. On ne coche pas pour autant « Sans rappel », qui n'est pas ce que la personne a choisi —
 * le toucher écrirait `none` en base, et un compte rattaché plus tard ne recevrait rien. La seule
 * chose vraie à montrer est donc qu'**aucune ligne atteignable n'est choisie** : rien ne paraît
 * choisi qui ne le soit.
 *
 * La feuille des rappels ne rencontre jamais ce cas — elle présélectionne une ligne choisissable
 * (`canalPreselectionne`) —, et c'est pourquoi l'écart ne se voyait que sur « Toi ». La règle vit ici
 * plutôt que dans `lignesDeReglage` : `choisi` y dit la **préférence enregistrée**, et c'est ce que
 * ses tests épinglent ; ce qui change ici est ce que l'écran en montre, pas la préférence.
 */
import type { LigneDeReglage } from '@/types/rappels';

export function paraitChoisie(ligne: Pick<LigneDeReglage, 'choisi' | 'choisissable'>): boolean {
  return ligne.choisi && ligne.choisissable;
}
