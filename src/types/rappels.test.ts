import { canalEffectif, lignesDeReglage, type EtatDesRappels } from '@/types/rappels';

// Les six lignes de la table de vérité de v1-12 §3, dans l'ordre du document. Le pendant SQL
// est `17_rappels_canal.test.sql`, qui épingle **exactement** les mêmes : c'est la paire qui
// protège, pas l'un des deux tests.
const TABLE: { cas: string; etat: EtatDesRappels; attendu: string }[] = [
  { cas: 'aucun rappel demandé', etat: { prefere: 'none', jetonActif: true, emailPossible: true }, attendu: 'aucun' },
  { cas: 'notification, jeton actif', etat: { prefere: 'push', jetonActif: true, emailPossible: false }, attendu: 'push' },
  { cas: 'notification refusée, mais un compte', etat: { prefere: 'push', jetonActif: false, emailPossible: true }, attendu: 'email' },
  { cas: 'notification refusée, sans compte', etat: { prefere: 'push', jetonActif: false, emailPossible: false }, attendu: 'aucun' },
  { cas: 'email, compte confirmé', etat: { prefere: 'email', jetonActif: false, emailPossible: true }, attendu: 'email' },
  { cas: 'email demandé, sans compte', etat: { prefere: 'email', jetonActif: true, emailPossible: false }, attendu: 'aucun' },
];

describe('canalEffectif', () => {
  it.each(TABLE)('$cas → $attendu', ({ etat, attendu }) => {
    expect(canalEffectif(etat)).toBe(attendu);
  });

  it('un « aucun rappel » ne repart jamais tout seul, quoi qu’il y ait par ailleurs', () => {
    expect(canalEffectif({ prefere: 'none', jetonActif: true, emailPossible: true })).toBe('aucun');
  });

  it('la préférence reste `push` même sans jeton — c’est ce qui rouvre la porte', () => {
    // Le canal *effectif* retombe sur l'email, mais rien dans ce module ne réécrit la
    // préférence : rouvrir les notifications dans les réglages du téléphone suffit alors à
    // faire repartir la notification, sans que la personne ait à revenir ici.
    const etat: EtatDesRappels = { prefere: 'push', jetonActif: false, emailPossible: true };
    expect(canalEffectif(etat)).toBe('email');
    expect(canalEffectif({ ...etat, jetonActif: true })).toBe('push');
  });
});

describe('lignesDeReglage', () => {
  const base = { prefere: 'push', jetonActif: true, emailPossible: true, email: 'camille@exemple.fr' } as const;

  it('propose les trois canaux sur mobile, l’email et rien sur web', () => {
    expect(lignesDeReglage({ ...base, plateforme: 'natif' }).map((l) => l.canal)).toEqual([
      'push',
      'email',
      'none',
    ]);
    // Pas de push sur web en V1 : la ligne n'existe pas plutôt que d'être grisée — il n'y
    // aurait rien à expliquer à quelqu'un qui n'a pas de téléphone sous la main.
    expect(lignesDeReglage({ ...base, plateforme: 'web' }).map((l) => l.canal)).toEqual(['email', 'none']);
  });

  it('s’ouvre à une session anonyme : le push n’a pas besoin de compte', () => {
    const lignes = lignesDeReglage({
      prefere: 'push',
      jetonActif: true,
      emailPossible: false,
      email: null,
      plateforme: 'natif',
    });
    expect(lignes.find((l) => l.canal === 'push')?.choisissable).toBe(true);
  });

  it('dit pourquoi l’email n’est pas disponible, et ne le rend pas choisissable', () => {
    const email = lignesDeReglage({
      prefere: 'push',
      jetonActif: true,
      emailPossible: false,
      email: null,
      plateforme: 'natif',
    }).find((l) => l.canal === 'email');

    expect(email?.choisissable).toBe(false);
    expect(email?.detail).toBe('Rattache un compte pour l’activer.');
  });

  it('dit pourquoi la notification n’arrive pas, sans fermer la porte', () => {
    const notification = lignesDeReglage({
      prefere: 'push',
      jetonActif: false,
      emailPossible: true,
      email: 'camille@exemple.fr',
      plateforme: 'natif',
    }).find((l) => l.canal === 'push');

    expect(notification?.detail).toBe('Coupées dans les réglages de ce téléphone.');
    // Toujours choisissable : c'est ce qui permet de rouvrir les notifications côté système
    // et de voir le rappel repartir sans revenir ici.
    expect(notification?.choisissable).toBe(true);
  });

  it('affiche l’adresse quand elle est utilisable, et marque le canal choisi', () => {
    const lignes = lignesDeReglage({ ...base, prefere: 'email', plateforme: 'natif' });
    expect(lignes.find((l) => l.canal === 'email')?.detail).toBe('À camille@exemple.fr.');
    expect(lignes.filter((l) => l.choisi).map((l) => l.canal)).toEqual(['email']);
  });

  it('n’annonce jamais un compteur ni une échéance chiffrée', () => {
    // Le registre de /suivi vaut ici : aucune série, aucun décompte. Les libellés du réglage
    // sont du produit et non de Ramille, mais ils ne doivent pas non plus compter les jours.
    for (const ligne of lignesDeReglage({ ...base, plateforme: 'natif' })) {
      expect(ligne.titre).not.toMatch(/\d/);
    }
  });
});
