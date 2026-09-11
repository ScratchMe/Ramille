import React from 'react';
import { TextLink } from 'ramille-design-system';

const Colonne = ({ children }: { children?: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'stretch' }}>{children}</div>
);

/**
 * Les trois registres réels : l'action discrète sous un bouton, le lien d'un autre
 * chemin, et la sortie d'un engagement. Le libellé annoncé EST le texte affiché.
 */
export const Registres = () => (
  <Colonne>
    <TextLink label="Modifier mes réponses" type="small" themeColor="textTertiary" align="center" />
    <TextLink label="Utiliser un email à la place" type="linkPrimary" align="center" />
    <TextLink label="J'ai déjà un compte" type="linkPrimary" align="center" />
    <TextLink label="Changer d'avis" type="small" themeColor="textTertiary" underline align="center" />
  </Colonne>
);

/** Aligné à gauche, dans le flux d'un texte : le pied des pages légales. */
export const DansLeTexte = () => (
  <Colonne>
    <TextLink label="Politique de confidentialité" type="small" themeColor="textSecondary" underline />
    <TextLink label="Conditions d'utilisation" type="small" themeColor="textSecondary" underline />
    <TextLink label="Ouvrir les réglages du téléphone" type="small" themeColor="accentText" />
  </Colonne>
);

/** Désactivé : le lien reste lisible, il ne disparaît pas. */
export const Desactive = () => (
  <TextLink label="Renvoyer le lien" type="small" themeColor="textTertiary" disabled align="center" />
);
