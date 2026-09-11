import React from 'react';
import { ActionCard, ActionCommitment, TextLink } from 'ramille-design-system';

/**
 * L'action engagée : bordure accent 2 px, fond teinté, étiquette à pastille-coche,
 * et l'intention en jours de la semaine — la saillance dit laquelle porte l'engagement.
 */
export const Engagee = () => (
  <ActionCard
    titre="Faire ce trajet à vélo"
    gainKg={184}
    partPercent={7}
    intention="le mardi et le jeudi"
    etiquette="TON ENGAGEMENT"
    engagee
  >
    <ActionCommitment state="committed" />
  </ActionCard>
);

/** Proposée, rien d'engagé encore : bordure 1 px sur blanc. */
export const Proposee = () => (
  <ActionCard titre="Travailler depuis chez toi un jour par semaine" gainKg={240} partPercent={9}>
    <ActionCommitment kind="days" state="idle" />
  </ActionCard>
);

/** Le choix des jours, ouvert sous l'action — domicile-travail, jamais une saisie libre. */
export const ChoixDesJours = () => (
  <ActionCard titre="Faire ce trajet à vélo" gainKg={184} partPercent={7}>
    <ActionCommitment kind="days" state="picking" days={[1, 3]} />
  </ActionCard>
);

/**
 * Estompée parce qu'une autre action porte l'engagement — opacité 0,72, et elle reste
 * cliquable. Une seule action engagée par saison, mais aucune n'est fermée.
 */
export const Estompee = () => (
  <ActionCard titre="Prendre le train pour ce voyage" gainKg={412} partPercent={16} estompee>
    <ActionCommitment kind="timing" state="idle" otherActionCommitted />
  </ActionCard>
);

/** Avec un détail de segment et le lien qui libère, sans rien compter. */
export const AvecDetail = () => (
  <ActionCard
    titre="Faire ce trajet en métro"
    gainKg={96}
    partPercent={4}
    detail="sur 12 km aller, 4 jours par semaine"
    intention="le lundi et le vendredi"
    etiquette="TON ENGAGEMENT"
    engagee
  >
    <TextLink label="Changer d'avis" type="small" themeColor="textTertiary" underline />
  </ActionCard>
);
