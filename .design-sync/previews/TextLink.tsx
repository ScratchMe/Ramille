import React from 'react';
import { TextLink } from 'ramille-design-system';

const Colonne = ({ children }: { children?: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'stretch' }}>{children}</div>
);

/**
 * Les trois apparences, et pas une de plus (`v1-33` T-5) : `action` pour l'autre chemin sous un
 * bouton, `discret` pour ce qui se propose sans pousser, `souligne` pour un lien discret qu'une
 * phrase du même gris touche, ou posé dans une carte. Le libellé annoncé EST le texte affiché.
 */
export const Registres = () => (
  <Colonne>
    <TextLink label="Utiliser un email à la place" apparence="action" style={{ textAlign: 'center' }} />
    <TextLink label="J'ai déjà un compte" apparence="action" style={{ textAlign: 'center' }} />
    <TextLink label="Faire un nouveau bilan" apparence="discret" style={{ textAlign: 'center' }} />
    <TextLink label="Changer d'avis" apparence="souligne" style={{ textAlign: 'center' }} />
  </Colonne>
);

/** Aligné à gauche, dans le flux d'un texte : le pied des pages légales. */
export const DansLeTexte = () => (
  <Colonne>
    <TextLink label="Politique de confidentialité" apparence="souligne" />
    <TextLink label="Conditions d'utilisation" apparence="souligne" />
    <TextLink label="Ouvrir les réglages du téléphone" apparence="action" />
  </Colonne>
);

/**
 * Désactivé : le lien reste lisible, il ne disparaît pas. « Renvoyer un code » agit dans l'écran
 * (un nouvel envoi) sans mener nulle part, donc `role="button"` — le produit envoie un code à
 * huit chiffres depuis le 20/09/2026, plus de lien.
 */
export const Desactive = () => (
  <TextLink label="Renvoyer un code" apparence="souligne" role="button" disabled style={{ textAlign: 'center' }} />
);
