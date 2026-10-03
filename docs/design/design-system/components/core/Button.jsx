import React from 'react';
// Source : src/components/button.tsx — 54 de haut au moins, rayon 27, primary accent / secondary élément ;
// `onPanel` sur une surface teintée ; sous le doigt, la teinte appuyée, sans animation.
//
// `enAttente` : le bouton agit, mais l'action qu'il porte attend encore quelque chose — le « Suivant » d'une étape
// incomplète, qui mène à ce qui manque au lieu d'avancer. L'apparence du désactivé (fond élément, texte tertiaire) et
// rien d'autre : ni `disabled`, ni `aria-disabled`. Un bouton qui agit n'est pas indisponible, et react-native-web
// ferait d'un `aria-disabled` vrai un `<button disabled>` inerte. Sous le doigt, la teinte d'une surface neutre
// (`backgroundPressed`) : le gris ne vire pas au vert foncé de l'accent appuyé.
export function Button({ title, onPress, variant = 'primary', disabled, enAttente, flex, onPanel, accessibilityHint, style, ...rest }) {
  // Posé sur un panneau gris ou teinté, un secondaire prend le fond de l'écran et un filet : gris sur
  // gris, sa forme disparaît. Sans effet sur le principal actif, dont l'accent se voit partout. **Un bouton grisé
  // aussi, depuis le 03/10/2026** (brief de l'étape du contexte §4.5) : « C'est noté » en attente prenait le gris de
  // l'encart du choix des jours (`surfaceDuBouton`, src/types/surface-du-bouton.ts). Le filet se dessine dans la
  // boîte : le rembourrage lui cède son pixel, et le bouton garde ses 54 px à côté d'un principal.
  // L'apparence du désactivé vaut pour les deux : `disabled` (inerte) et `enAttente` (qui agit).
  const gris = disabled || enAttente;
  const surPanneau = onPanel && (variant === 'secondary' || gris);
  const bg = surPanneau ? 'var(--color-background)' : gris ? 'var(--color-background-element)' : variant === 'primary' ? 'var(--color-accent)' : 'var(--color-background-element)';
  const color = gris ? 'var(--color-text-tertiary)' : variant === 'primary' ? 'var(--color-on-accent)' : 'var(--color-text)';
  // `accessibilityHint` n'a pas d'équivalent sur web (react-native-web l'ignore) : il n'est pas rendu.
  return (
    <button type="button" onClick={onPress} disabled={disabled} aria-label={title} data-appui="fond" {...rest}
      style={{ '--teinte-appuyee': variant === 'primary' && !enAttente ? 'var(--color-accent-pressed)' : 'var(--color-background-pressed)', minHeight: 54, padding: surPanneau ? '14px 23px' : '15px 24px', borderRadius: 27, border: surPanneau ? '1px solid var(--color-border)' : 0, background: bg, color, fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: '24px', fontWeight: variant === 'secondary' ? 500 : 600, cursor: disabled ? 'default' : 'pointer', flex: flex ? 1 : undefined, width: flex ? undefined : '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      {title}
    </button>
  );
}
