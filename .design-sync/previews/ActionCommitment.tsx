import React from 'react';
import { ActionCommitment } from 'ramille-design-system';

const Cadre = ({ children }: { children?: React.ReactNode }) => (
  <div style={{ border: '1px solid var(--color-border)', borderRadius: 18, padding: 20, background: 'var(--color-background)' }}>{children}</div>
);

/** Au repos : l'invitation à s'engager, rien de choisi. */
export const AuRepos = () => <Cadre><ActionCommitment kind="days" state="idle" /></Cadre>;

/**
 * Le choix des jours, pour le poste domicile-travail — en jours de la semaine, et jamais une
 * saisie libre. L'intention est obligatoire : s'engager sans dire quand ne veut rien dire.
 */
export const ChoixDesJours = () => <Cadre><ActionCommitment kind="days" state="picking" days={[2, 4]} /></Cadre>;

/** Pour les autres postes, une échéance fermée plutôt que des jours. */
export const ChoixDeLEcheance = () => (
  <Cadre><ActionCommitment kind="timing" state="picking" timing="le_mois_prochain" /></Cadre>
);

/** Engagé : l'étiquette, et le lien qui libère sans rien compter. */
export const Engage = () => <Cadre><ActionCommitment state="committed" /></Cadre>;

/**
 * Une autre action porte l'engagement — une seule par cycle. Celle-ci reste cliquable : on
 * ne ferme pas l'autre chemin, on dit seulement lequel est retenu.
 */
export const UneAutreEstEngagee = () => (
  <Cadre><ActionCommitment kind="days" state="idle" otherActionCommitted /></Cadre>
);
