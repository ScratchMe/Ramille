import { RAMILLE } from '@/constants/mascotte';
import {
  canalEffectif,
  canalPreselectionne,
  carteAttente,
  doitProposerLaFeuille,
  libelleBouton,
  lignesDeReglage,
  type EtatDesRappels,
} from '@/types/rappels';

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
  const base = {
    prefere: 'push',
    jetonActif: true,
    emailPossible: true,
    email: 'camille@exemple.fr',
    permission: 'accordee',
  } as const;

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
      permission: 'accordee',
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
      permission: 'accordee',
    }).find((l) => l.canal === 'email');

    expect(email?.choisissable).toBe(false);
    expect(email?.detail).toBe('Rattache un compte pour l’activer.');
  });

  it('distingue les trois états de la permission, et ne ferme jamais la porte', () => {
    // Trois détails et non deux : l'absence de jeton recouvrait la permission jamais demandée,
    // le refus, l'échec d'enregistrement et le simulateur. La première ouverture de « Toi » sur
    // un téléphone neuf annonçait donc des notifications « coupées dans les réglages », ce qui
    // est faux et envoie chercher un réglage que personne n'a touché (A4-15).
    const detail = (permission: 'accordee' | 'demandable' | 'fermee') =>
      lignesDeReglage({ ...base, jetonActif: false, plateforme: 'natif', permission }).find(
        (l) => l.canal === 'push'
      );

    expect(detail('accordee')?.detail).toBe('Le matin où la question s’ouvre.');
    expect(detail('demandable')?.detail).toBe('À activer en une fois.');
    expect(detail('fermee')?.detail).toBe(
      'Coupées dans les réglages du téléphone — c’est là que ça se rouvre.'
    );

    // Toujours choisissable, quel que soit l'état : c'est ce qui permet de rouvrir les
    // notifications côté système et de voir le rappel repartir sans revenir ici.
    for (const permission of ['accordee', 'demandable', 'fermee'] as const) {
      expect(detail(permission)?.choisissable).toBe(true);
    }
  });

  it('ne donne la porte des réglages que là où elle mène quelque part', () => {
    const lienDe = (permission: 'accordee' | 'demandable' | 'fermee') =>
      lignesDeReglage({ ...base, plateforme: 'natif', permission }).filter(
        (l) => l.lienVersLesReglages
      );

    expect(lienDe('fermee').map((l) => l.canal)).toEqual(['push']);
    expect(lienDe('accordee')).toEqual([]);
    expect(lienDe('demandable')).toEqual([]);
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

describe('canalPreselectionne', () => {
  const anonyme = { emailPossible: false, email: null, permission: 'demandable' } as const;
  const rattache = { emailPossible: true, email: 'camille@exemple.fr', permission: 'demandable' } as const;

  it('sur natif sans compte, propose la notification et jamais l’email', () => {
    // Le défaut en base vaut `email` : c'est l'état de toute session anonyme, donc le cas
    // majoritaire. La feuille présélectionnait une ligne grisée, s'intitulait « C'est bon » et
    // écrivait un canal dont l'effectif est `aucun` (A4-4).
    expect(
      canalPreselectionne({ ...anonyme, prefere: 'email', jetonActif: false, plateforme: 'natif' })
    ).toBe('push');
  });

  it('garde ce que la personne a déjà choisi quand la ligne est choisissable', () => {
    expect(
      canalPreselectionne({ ...rattache, prefere: 'email', jetonActif: false, plateforme: 'natif' })
    ).toBe('email');
    expect(
      canalPreselectionne({ ...anonyme, prefere: 'none', jetonActif: false, plateforme: 'natif' })
    ).toBe('none');
    expect(
      canalPreselectionne({ ...anonyme, prefere: 'push', jetonActif: true, plateforme: 'natif' })
    ).toBe('push');
  });

  it('sur web, propose l’email avec un compte, rien sans', () => {
    expect(
      canalPreselectionne({ ...rattache, prefere: 'email', jetonActif: false, plateforme: 'web' })
    ).toBe('email');
    // La feuille ne s'ouvre pas dans ce cas (`doitProposerLaFeuille`) ; l'assertion garde la
    // règle générale, pas ce cas d'écran — un canal qui deviendrait choisissable sur web demain
    // doit sortir d'ici sans retouche. (« Toi » n'appelle pas cette dérivation : il affiche la
    // préférence telle quelle, sans présélection.)
    expect(
      canalPreselectionne({ ...anonyme, prefere: 'email', jetonActif: false, plateforme: 'web' })
    ).toBe('none');
  });

  it('ne présélectionne jamais une ligne non choisissable, quelle que soit la situation', () => {
    // La règle générale, pas le cas particulier : un canal ajouté demain y entre sans rien à
    // retoucher, et c'est elle qui empêche la cérémonie de se refermer sur rien.
    for (const plateforme of ['natif', 'web'] as const) {
      for (const emailPossible of [true, false]) {
        for (const prefere of ['push', 'email', 'none'] as const) {
          const etat = {
            prefere,
            jetonActif: false,
            emailPossible,
            email: emailPossible ? 'camille@exemple.fr' : null,
            plateforme,
            permission: 'demandable' as const,
          };
          const canal = canalPreselectionne(etat);
          const ligne = lignesDeReglage(etat).find((l) => l.canal === canal);
          expect(ligne?.choisissable).toBe(true);
        }
      }
    }
  });
});

describe('doitProposerLaFeuille', () => {
  it('ne s’ouvre qu’une fois par appareil', () => {
    const base = { plateforme: 'natif', emailPossible: true } as const;
    expect(doitProposerLaFeuille({ ...base, dejaProposee: false })).toBe(true);
    expect(doitProposerLaFeuille({ ...base, dejaProposee: true })).toBe(false);
  });

  it('s’ouvre sur mobile même sans compte — le push n’en a pas besoin', () => {
    expect(
      doitProposerLaFeuille({ plateforme: 'natif', emailPossible: false, dejaProposee: false })
    ).toBe(true);
  });

  it('ne s’ouvre pas sur web sans compte : il n’y aurait rien à choisir', () => {
    expect(
      doitProposerLaFeuille({ plateforme: 'web', emailPossible: false, dejaProposee: false })
    ).toBe(false);
    expect(
      doitProposerLaFeuille({ plateforme: 'web', emailPossible: true, dejaProposee: false })
    ).toBe(true);
  });
});

describe('libelleBouton', () => {
  it('n’annonce le dialogue système que s’il va vraiment s’en ouvrir un', () => {
    expect(libelleBouton('push', 'demandable')).toBe('Autoriser les notifications');
    // Permission déjà accordée, ou Android 12 et avant : aucune boîte ne s'ouvrira, et le
    // promettre serait une petite trahison au seul moment où la confiance compte.
    expect(libelleBouton('push', 'accordee')).toBe('C’est bon');
    // Deux refus : le dialogue ne reviendra plus jamais. Même règle.
    expect(libelleBouton('push', 'fermee')).toBe('C’est bon');
  });

  it('dit ce que le bouton fait pour les deux autres canaux', () => {
    expect(libelleBouton('email', 'demandable')).toBe('C’est bon');
    expect(libelleBouton('none', 'demandable')).toBe('Continuer sans rappel');
  });
});

describe('carteAttente', () => {
  const camille = { email: 'camille@exemple.fr' };

  it('nomme le jour, et le canal quand il y en a un', () => {
    expect(
      carteAttente({ plateforme: 'natif',
        prefere: 'push',
        jetonActif: true,
        emailPossible: true,
        boucle: 'hebdo',
        permission: 'accordee',
        ...camille,
      })
    ).toEqual({ cle: 'attenteSigneHebdo', detail: 'Par notification sur ce téléphone.' });

    expect(
      carteAttente({ plateforme: 'natif',
        prefere: 'email',
        jetonActif: false,
        emailPossible: true,
        boucle: 'mensuel',
        permission: 'accordee',
        ...camille,
      })
    ).toEqual({ cle: 'attenteSigneMensuel', detail: 'Par email, à camille@exemple.fr.' });
  });

  it('dit le repli sans reproche quand la notification est coupée', () => {
    expect(
      carteAttente({ plateforme: 'natif',
        prefere: 'push',
        jetonActif: false,
        emailPossible: true,
        boucle: 'hebdo',
        permission: 'fermee',
        ...camille,
      })
    ).toEqual({
      cle: 'attenteSigneHebdo',
      detail: 'Par email, à camille@exemple.fr — les notifications sont coupées sur ce téléphone.',
    });
  });

  it('n’accuse les réglages que là où quelqu’un les a vraiment fermés', () => {
    // Les deux portes du même état — préférence `push`, aucun jeton — séparées par la seule
    // chose qui les distingue : la permission. Depuis que `jetonActif` ne vaut plus vrai sur la
    // seule permission accordée, il est faux aussi quand l'enregistrement a échoué (pas
    // d'identifiants FCM, pas de réseau, simulateur) : la carte annonçait alors « les
    // notifications sont coupées sur ce téléphone » à qui venait d'appuyer sur « Autoriser »
    // (A4-15, point 2). Le canal annoncé, lui, est juste dans les deux cas.
    const sansJeton = { prefere: 'push', jetonActif: false, boucle: 'hebdo' } as const;

    expect(
      carteAttente({ plateforme: 'natif', ...sansJeton, emailPossible: true, permission: 'accordee', ...camille })
    ).toEqual({ cle: 'attenteSigneHebdo', detail: 'Par email, à camille@exemple.fr.' });

    expect(
      carteAttente({ plateforme: 'natif', ...sansJeton, emailPossible: true, permission: 'fermee', ...camille })
    ).toEqual({
      cle: 'attenteSigneHebdo',
      detail: 'Par email, à camille@exemple.fr — les notifications sont coupées sur ce téléphone.',
    });

    // Sans compte, l'enregistrement raté ne laisse rien à dire : l'état se répare au prochain
    // lancement, et envoyer chercher un réglage que personne n'a touché serait la seule chose
    // que la personne pourrait lire comme un reproche.
    expect(
      carteAttente({ plateforme: 'natif', ...sansJeton, emailPossible: false, permission: 'accordee', email: null })
    ).toEqual({ cle: 'attenteIciHebdo', detail: null });
  });

  // **Sur web il n'y a ni téléphone ni réglage à ouvrir, et le dire serait faux deux fois.**
  // `lirePermission()` rend toujours `fermee` dans un navigateur, et `jetonActif` y est toujours
  // faux depuis que le jeton est un fait de cet appareil : sans la garde de plateforme, quelqu'un
  // dont la préférence est `push` lisait « les notifications sont coupées sur ce téléphone » sur
  // une machine de bureau — pendant que celles de son téléphone marchaient. C'est la bascule par
  // appareil qui a ouvert ce cas ; cette assertion est là pour qu'il ne se rouvre pas.
  it('n’accuse jamais les réglages depuis un navigateur', () => {
    expect(
      carteAttente({
        plateforme: 'web',
        prefere: 'push',
        jetonActif: false,
        emailPossible: false,
        boucle: 'hebdo',
        permission: 'fermee',
        email: null,
      })
    ).toEqual({ cle: 'attenteIciHebdo', detail: null });

    // Et la même personne, sur son téléphone, lit bien la phrase : c'est la plateforme qui
    // distingue les deux, pas l'état des rappels, identique dans les deux appels.
    expect(
      carteAttente({
        plateforme: 'natif',
        prefere: 'push',
        jetonActif: false,
        emailPossible: false,
        boucle: 'hebdo',
        permission: 'fermee',
        email: null,
      }).detail
    ).toContain('coupées sur ce téléphone');
  });

  it('sans rappel, Ramille revient quand même — dans l’app', () => {
    expect(
      carteAttente({ plateforme: 'natif',
        prefere: 'none',
        jetonActif: true,
        emailPossible: true,
        boucle: 'hebdo',
        permission: 'accordee',
        email: null,
      })
    ).toEqual({ cle: 'attenteIciHebdo', detail: null });

    expect(
      carteAttente({ plateforme: 'natif',
        prefere: 'none',
        jetonActif: false,
        emailPossible: false,
        boucle: 'mensuel',
        permission: 'fermee',
        email: null,
      })
    ).toEqual({ cle: 'attenteIciMensuel', detail: null });
  });

  it('dit la porte quand le mot est attendu par email et qu’aucune adresse ne peut le recevoir', () => {
    // La sixième ligne du §3, celle qui manquait des deux côtés — ici et dans la couverture
    // que cet en-tête revendiquait. C'est l'état par défaut de toute session anonyme
    // (`reminder_channel` vaut `email` en base), donc le cas le plus fréquent : la carte disait
    // « On se retrouve ici lundi. » sans rien ajouter, et rien nulle part n'apprenait qu'aucun
    // rappel ne partirait (A4-5).
    expect(
      carteAttente({ plateforme: 'natif',
        prefere: 'email',
        jetonActif: false,
        emailPossible: false,
        boucle: 'hebdo',
        permission: 'demandable',
        email: null,
      })
    ).toEqual({
      cle: 'attenteIciHebdo',
      detail: 'Rattache un compte pour recevoir le mot par email.',
    });

    // Un jeton existe mais la préférence reste `email` : le canal effectif est toujours
    // `aucun`, et la phrase ne parle donc pas de notification.
    expect(
      carteAttente({ plateforme: 'natif',
        prefere: 'email',
        jetonActif: true,
        emailPossible: false,
        boucle: 'mensuel',
        permission: 'accordee',
        email: null,
      })
    ).toEqual({
      cle: 'attenteIciMensuel',
      detail: 'Rattache un compte pour recevoir le mot par email.',
    });
  });

  it('le refus sans compte nomme les deux portes, une fois', () => {
    // Le cas qu'on oublie : la personne a dit oui chez nous puis non au téléphone, et elle
    // n'a pas de compte. Ni reproche, ni relance — les deux chemins, dits une seule fois.
    expect(
      carteAttente({ plateforme: 'natif',
        prefere: 'push',
        jetonActif: false,
        emailPossible: false,
        boucle: 'hebdo',
        permission: 'fermee',
        email: null,
      })
    ).toEqual({
      cle: 'attenteIciHebdo',
      detail:
        'Les notifications sont coupées sur ce téléphone. Tu peux les rouvrir dans ses réglages, ou rattacher un compte pour l’email.',
    });
  });

  it('ne met jamais de chiffre dans la bouche de Ramille', () => {
    // Le détail (qui peut porter une adresse, donc un chiffre) est **du produit** ; seule la
    // clé désigne ce qu'elle dit, et ces lignes-là sont gardées par le test de mascotte.ts.
    const carte = carteAttente({ plateforme: 'natif',
      prefere: 'email',
      jetonActif: false,
      emailPossible: true,
      boucle: 'hebdo',
      permission: 'accordee',
      email: 'camille42@exemple.fr',
    });
    expect(carte.cle).not.toMatch(/\d/);
    expect(RAMILLE[carte.cle]).not.toMatch(/\d/);
  });
});
