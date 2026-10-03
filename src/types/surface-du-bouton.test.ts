import { surfaceDuBouton } from '@/types/surface-du-bouton';

// La surface d'un bouton (03/10/2026, `FRONT.md` §2.4). Ce test garde la fonction, pas ses appels : que
// « C'est noté » passe `onPanel`, c'est `action-commitment` qui le dit, et le canvas de l'étape du
// contexte qui l'a décidé (brief §4.5).
//
// **Éprouvé en le cassant, le 03/10/2026**, une mutation à la fois :
//   - le grisé sur panneau rendu comme avant (`fond: 'backgroundElement'`, sans filet) → « en attente sur
//     un panneau » et « désactivé sur un panneau », et eux seuls ;
//   - le filet retiré du secondaire sur panneau → « un secondaire sur un panneau », et lui seul ;
//   - le principal sur panneau traité comme un secondaire → « un principal actif ne change pas sur un
//     panneau », et lui seul ;
//   - la teinte appuyée de l'accent rendue au bouton en attente → « en attente, sous le doigt… », et les
//     deux autres cas en attente, qui comparent la surface entière.

const base = { grise: false, enAttente: false, surPanneau: false } as const;

describe('surfaceDuBouton', () => {
  it('un principal : l’accent, l’encre sur l’accent, sans filet', () => {
    expect(surfaceDuBouton({ ...base, variant: 'primary' })).toEqual({
      fond: 'accent',
      fondAppuye: 'accentPressed',
      encre: 'onAccent',
      filet: false,
    });
  });

  it('un principal actif ne change pas sur un panneau', () => {
    expect(surfaceDuBouton({ ...base, variant: 'primary', surPanneau: true })).toEqual(
      surfaceDuBouton({ ...base, variant: 'primary' })
    );
  });

  it('un secondaire : le gris des panneaux', () => {
    expect(surfaceDuBouton({ ...base, variant: 'secondary' })).toEqual({
      fond: 'backgroundElement',
      fondAppuye: 'backgroundPressed',
      encre: 'text',
      filet: false,
    });
  });

  it('un secondaire sur un panneau : le fond de l’écran et un filet', () => {
    expect(surfaceDuBouton({ ...base, variant: 'secondary', surPanneau: true })).toEqual({
      fond: 'background',
      fondAppuye: 'backgroundPressed',
      encre: 'text',
      filet: true,
    });
  });

  it('en attente sur la page : l’apparence du désactivé', () => {
    expect(surfaceDuBouton({ variant: 'primary', grise: true, enAttente: true, surPanneau: false })).toEqual({
      fond: 'backgroundElement',
      fondAppuye: 'backgroundPressed',
      encre: 'textTertiary',
      filet: false,
    });
  });

  it('en attente sur un panneau : le fond de l’écran et un filet, l’encre tertiaire', () => {
    expect(surfaceDuBouton({ variant: 'primary', grise: true, enAttente: true, surPanneau: true })).toEqual({
      fond: 'background',
      fondAppuye: 'backgroundPressed',
      encre: 'textTertiary',
      filet: true,
    });
  });

  it('désactivé sur un panneau : la même forme que l’attente', () => {
    const surface = surfaceDuBouton({ variant: 'primary', grise: true, enAttente: false, surPanneau: true });
    expect(surface).toMatchObject({ fond: 'background', encre: 'textTertiary', filet: true });
  });

  it('en attente, sous le doigt, la teinte d’une surface neutre — jamais l’accent appuyé', () => {
    expect(surfaceDuBouton({ variant: 'primary', grise: true, enAttente: true, surPanneau: false }).fondAppuye).toBe(
      'backgroundPressed'
    );
  });
});
