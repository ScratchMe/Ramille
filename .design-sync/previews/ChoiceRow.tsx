import React from 'react';
import { ChoiceRow } from 'ramille-design-system';

const Liste = ({ children }: { children?: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
);

/** Un choix exclusif, pleine largeur — la première question du questionnaire. */
export const OuiNon = () => (
  <Liste>
    <ChoiceRow label="Oui" selected />
    <ChoiceRow label="Non" selected={false} />
  </Liste>
);

/**
 * Le canal de rappel, avec sa seconde ligne. « Rien » est un choix à part entière, présenté
 * comme les autres : pas de canal par défaut qu'on aurait à refuser.
 */
export const CanalDeRappel = () => (
  <Liste>
    <ChoiceRow label="Une notification" detail="Sur ce téléphone, le lundi matin." selected />
    <ChoiceRow label="Un email" detail="À l’adresse de ton compte." selected={false} />
    <ChoiceRow label="Rien" detail="On se retrouve ici lundi." selected={false} />
  </Liste>
);

/** Indisponible : on dit pourquoi dans le détail, on ne masque pas la ligne. */
export const Indisponible = () => (
  <Liste>
    <ChoiceRow
      label="Une notification"
      detail="Les notifications sont coupées dans les réglages du téléphone."
      selected={false}
      disabled
    />
    <ChoiceRow label="Un email" detail="À l’adresse de ton compte." selected />
  </Liste>
);
