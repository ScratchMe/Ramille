import {
  dateCalendaire,
  engagementDeLaPeriodeCourante,
  phraseDeLEngagementRecalcule,
  type CyclePourRebilan,
} from '@/types/rebilan';

const action = (
  surcharge: Partial<CyclePourRebilan['actions'][number]> = {}
): CyclePourRebilan['actions'][number] => ({
  committed_at: null,
  intention_days: null,
  intention_timing: null,
  action_templates: { action_text: 'Faire un trajet sur cinq à vélo.' },
  ...surcharge,
});

const cycle = (surcharge: Partial<CyclePourRebilan> = {}): CyclePourRebilan => ({
  period_start: '2026-09-01',
  period_end: '2026-11-30',
  actions: [],
  ...surcharge,
});

describe('dateCalendaire', () => {
  it('rend la date du calendrier local, et non la date UTC', () => {
    // 00 h 30 à Paris le 1er décembre est le 30 novembre à 23 h 30 UTC : `toISOString` dirait
    // « 2026-11-30 », donc la saison encore en cours, un jour de trop.
    //
    // **Ce test n'a de sens que sous `TZ=Europe/Paris`**, et le fuseau est forcé par le script
    // `npm test` — pas par une configuration de Jest. Un `npx jest` lancé à la main tourne donc
    // dans le fuseau de la machine et fait tomber cette assertion sans qu'il y ait de défaut :
    // relevé en écrivant ce fichier, et c'est la raison pour laquelle la suite se joue par
    // `npm test`.
    expect(dateCalendaire(new Date('2026-12-01T00:30:00+01:00'))).toBe('2026-12-01');
  });

  it('complète le mois et le jour sur deux chiffres', () => {
    expect(dateCalendaire(new Date('2026-03-07T12:00:00+01:00'))).toBe('2026-03-07');
  });
});

describe('engagementDeLaPeriodeCourante', () => {
  it('ne trouve rien sans cycle', () => {
    expect(engagementDeLaPeriodeCourante(null, '2026-09-18')).toBeNull();
  });

  it('ne trouve rien quand aucune action n’est engagée', () => {
    const c = cycle({ actions: [action(), action()] });
    expect(engagementDeLaPeriodeCourante(c, '2026-09-18')).toBeNull();
  });

  it('rend l’action engagée et son intention dans la période', () => {
    const c = cycle({
      actions: [
        action(),
        action({ committed_at: '2026-09-10T08:00:00Z', intention_days: [2, 4] }),
      ],
    });

    expect(engagementDeLaPeriodeCourante(c, '2026-09-18')).toEqual({
      action: 'Faire un trajet sur cinq à vélo.',
      intention: 'le mardi et le jeudi',
    });
  });

  it('lit aussi une intention en échéance fermée', () => {
    const c = cycle({
      actions: [action({ committed_at: '2026-09-10T08:00:00Z', intention_timing: 'ce_mois' })],
    });

    expect(engagementDeLaPeriodeCourante(c, '2026-09-18')?.intention).toBe('ce mois-ci');
  });

  it('rend l’action sans intention quand la ligne n’en porte pas', () => {
    // **Branche défensive, et le test la garde pour ça** : la base impose une intention à toute
    // action engagée (`plan_actions_engagement_coherent`), mais `formatIntention` rend `null` si le
    // client ne sait pas lire la valeur — une échéance ajoutée côté SQL et pas côté TypeScript.
    const c = cycle({ actions: [action({ committed_at: '2026-09-10T08:00:00Z' })] });

    expect(engagementDeLaPeriodeCourante(c, '2026-09-18')).toEqual({
      action: 'Faire un trajet sur cinq à vélo.',
      intention: null,
    });
  });

  it('borne la période sur son dernier jour inclus', () => {
    const c = cycle({ actions: [action({ committed_at: '2026-09-10T08:00:00Z' })] });

    expect(engagementDeLaPeriodeCourante(c, '2026-11-30')).not.toBeNull();
    // **Le lendemain, plus rien à dire** : le cycle suivant est neuf, donc l'engagement est
    // *reconduit* par un autre chemin (C2.2) et la feuille n'aurait aucune règle à annoncer. C'est
    // toute la raison pour laquelle le seuil est une période et pas un nombre de jours.
    expect(engagementDeLaPeriodeCourante(c, '2026-12-01')).toBeNull();
  });

  it('ne dit rien avant le début de la période', () => {
    const c = cycle({ actions: [action({ committed_at: '2026-09-10T08:00:00Z' })] });
    expect(engagementDeLaPeriodeCourante(c, '2026-08-31')).toBeNull();
  });

  it('compare les bornes en chaînes, donc sans repasser par un Date', () => {
    // La garde qui compte : `new Date('2026-11-30')` est minuit **UTC**, donc le 29 à Paris — une
    // comparaison par `Date` ferait sortir de la période un jour trop tôt. Ici le 30 septembre
    // d'une saison d'été finie la veille doit rendre `null` sans ambiguïté de fuseau.
    const c = cycle({
      period_start: '2026-06-01',
      period_end: '2026-08-31',
      actions: [action({ committed_at: '2026-07-10T08:00:00Z' })],
    });

    expect(engagementDeLaPeriodeCourante(c, '2026-09-01')).toBeNull();
    expect(engagementDeLaPeriodeCourante(c, '2026-08-31')).not.toBeNull();
  });

  it('retombe sur le libellé de repli quand le gabarit manque', () => {
    const c = cycle({
      actions: [action({ committed_at: '2026-09-10T08:00:00Z', action_templates: null })],
    });

    expect(engagementDeLaPeriodeCourante(c, '2026-09-18')?.action).toBe('Action à préciser.');
  });
});

describe('phraseDeLEngagementRecalcule', () => {
  // **La phrase affirmait une perte, et le serveur ne la produit pas** (corrigé le 19/09/2026).
  // `generate_plan_cycle_for_user` repose l'engagement sur la ligne du nouveau plan qui porte le
  // même gabarit, et ne l'archive que `if not found`. Ces assertions gardent donc le
  // **conditionnel** : c'est la seule forme vraie dans les deux cas, et la reperdre ferait mentir
  // l'écran à quelqu'un qui, le plus souvent, garde son action.
  it('dit la condition, et jamais une perte certaine', () => {
    const phrase = phraseDeLEngagementRecalcule({
      action: 'Faire un trajet sur cinq à vélo.',
      intention: 'le mardi et le jeudi',
    });

    expect(phrase).toBe(
      'L’action que tu suis — Faire un trajet sur cinq à vélo — et le moment que tu avais choisi restent engagés si ton nouveau plan propose encore cette action. Sinon, tu en choisiras une autre.'
    );
    expect(phrase).not.toContain('ne seront plus');
  });

  it('dit la même condition sans intention', () => {
    const phrase = phraseDeLEngagementRecalcule({
      action: 'Faire un trajet sur cinq à vélo.',
      intention: null,
    });

    expect(phrase).toBe(
      'L’action que tu suis — Faire un trajet sur cinq à vélo — reste engagée si ton nouveau plan la propose encore. Sinon, tu en choisiras une autre.'
    );
    expect(phrase).not.toContain('ne sera plus');
  });

  it('retire le point final du libellé plutôt que d’enchaîner deux ponctuations', () => {
    const phrase = phraseDeLEngagementRecalcule({ action: 'Action à préciser.', intention: null });
    expect(phrase).not.toContain('.. ');
    expect(phrase).toContain('— Action à préciser —');
  });
});
