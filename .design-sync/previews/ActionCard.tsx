import React from 'react';
import { ActionCard, ActionCommitment, TextLink } from 'ramille-design-system';

/**
 * L'action engagée : bordure accent 2 px, fond teinté, étiquette « TON ENGAGEMENT » à
 * pastille-coche — posée par la carte elle-même, pas passée en prop —, l'intention en jours
 * de la semaine, et le premier pas, qui n'apparaît qu'une fois l'action engagée. Les libellés
 * sont ceux du référentiel d'actions (`action_templates`).
 */
export const Engagee = () => (
  <ActionCard
    titre="Faire un trajet sur cinq à vélo"
    gainKg={184}
    partPercent={7}
    intention="le mardi et le jeudi"
    premierPas="Repère un itinéraire cyclable avant ton premier jour."
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
  <ActionCard titre="Faire un trajet sur cinq à vélo" gainKg={184} partPercent={7}>
    <ActionCommitment kind="days" state="picking" days={[2, 4]} />
  </ActionCard>
);

/**
 * Estompée parce qu'une autre action porte l'engagement : elle recule par son cadre, jamais par
 * une opacité, et elle reste cliquable. Une seule action engagée par saison, mais aucune n'est
 * fermée.
 */
export const Estompee = () => (
  <ActionCard titre="Remplacer un aller-retour en avion par le train" gainKg={412} partPercent={16} estompee>
    <ActionCommitment kind="timing" poste="travel" state="idle" otherActionCommitted />
  </ActionCard>
);

/** Avec un détail de segment et le lien qui libère, sans rien compter. */
export const AvecDetail = () => (
  <ActionCard
    titre="Passer deux trajets sur cinq en métro ou en tram"
    gainKg={96}
    partPercent={4}
    detail="Sur tes 4 trajets par semaine."
    intention="le lundi et le vendredi"
    engagee
  >
    <TextLink label="Changer d’avis" type="small" themeColor="textTertiary" style={{ textDecoration: 'underline' }} />
  </ActionCard>
);
