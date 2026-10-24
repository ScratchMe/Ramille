/**
 * Répondre au point depuis l'e-mail — étape 6b de `v1-35` (24/10/2026), les dérivations de la page `/point`.
 *
 * Trois choses gardées : **la réponse du lien** (une des trois, sinon aucune), **la borne** (la page dit
 * « clos » exactement quand le serveur refuserait), et **l'état de la page**, qui ne dit jamais « plus
 * valable » avant d'avoir cherché le jeton, ni sur une panne.
 *
 * Éprouvé en le cassant, le 24/10/2026 — voir le relevé au pied.
 */
import {
  etatDeLaPageDuPoint,
  leLienAccepteUneReponse,
  phraseDeLaLectureDuPoint,
  reponseDuLien,
  type PointDuLien,
} from '@/types/reponse-par-le-lien';

const MERCREDI = new Date('2026-10-07T10:00:00Z');

const point = (surcharge: Partial<PointDuLien> = {}): PointDuLien => ({
  loop_type: 'commute',
  poste: 'commute',
  question_kind: 'generique',
  mode: 'voiture_thermique',
  // La semaine que les générateurs interrogent le mercredi 7 octobre : celle du lundi 28 septembre.
  period_start: '2026-09-28',
  period_label: 'Semaine du 28/09',
  trip_label: 'Trajet domicile-travail',
  question: 'La semaine dernière, as-tu changé de mode de transport pour ton trajet domicile-travail ?',
  committed_saving_kg_once: null,
  status: 'pending',
  response_kind: null,
  responded_at: null,
  boucle_tourne: true,
  ...surcharge,
});

describe('reponseDuLien', () => {
  it('rend une des trois réponses, le premier paramètre s’il est doublé', () => {
    expect(reponseDuLien('oui')).toBe('oui');
    expect(reponseDuLien('non')).toBe('non');
    expect(reponseDuLien(' sans_objet ')).toBe('sans_objet');
    expect(reponseDuLien(['non', 'oui'])).toBe('non');
  });

  it('ne propose rien d’une valeur inconnue ou absente', () => {
    expect(reponseDuLien('true')).toBeNull();
    expect(reponseDuLien('Oui')).toBeNull();
    expect(reponseDuLien('')).toBeNull();
    expect(reponseDuLien(undefined)).toBeNull();
  });
});

describe('leLienAccepteUneReponse — la borne du serveur', () => {
  it('accepte un point en attente, quelle que soit sa période', () => {
    expect(leLienAccepteUneReponse(point(), MERCREDI)).toBe(true);
    expect(leLienAccepteUneReponse(point({ period_start: '2026-09-14' }), MERCREDI)).toBe(true);
  });

  it('accepte la correction d’un point répondu tant que sa période est celle qu’on interroge', () => {
    expect(leLienAccepteUneReponse(point({ status: 'answered' }), MERCREDI)).toBe(true);
    expect(leLienAccepteUneReponse(point({ status: 'answered', period_start: '2026-09-21' }), MERCREDI)).toBe(false);
  });

  it('refuse un point clos', () => {
    expect(leLienAccepteUneReponse(point({ status: 'expired' }), MERCREDI)).toBe(false);
  });

  // La borne lit l'UTC, comme le serveur : le lundi 5 octobre à 1 h à Paris est encore le dimanche en UTC,
  // donc la semaine interrogée est toujours celle du 21 septembre.
  it('suit la bascule du lundi à minuit UTC, pas à minuit à Paris', () => {
    const repondu = point({ status: 'answered', period_start: '2026-09-21' });
    expect(leLienAccepteUneReponse(repondu, new Date('2026-10-04T23:30:00Z'))).toBe(true);
    expect(leLienAccepteUneReponse(repondu, new Date('2026-10-05T00:30:00Z'))).toBe(false);
  });
});

describe('etatDeLaPageDuPoint', () => {
  const ok = { ok: true as const, point: point() };

  it('charge tant qu’elle n’est pas prête, même sans jeton — jamais « plus valable » au premier rendu', () => {
    expect(etatDeLaPageDuPoint({ pret: false, jeton: null, lecture: null })).toBe('chargement');
    expect(etatDeLaPageDuPoint({ pret: false, jeton: 'j', lecture: ok })).toBe('chargement');
  });

  it('prête et sans jeton, le lien n’est plus valable ; avec, elle attend la lecture', () => {
    expect(etatDeLaPageDuPoint({ pret: true, jeton: null, lecture: null })).toBe('lien-invalide');
    expect(etatDeLaPageDuPoint({ pret: true, jeton: 'j', lecture: null })).toBe('chargement');
  });

  it('distingue la panne du jeton inconnu', () => {
    expect(etatDeLaPageDuPoint({ pret: true, jeton: 'j', lecture: { ok: false, genre: 'horsLigne' } })).toBe('panne');
    expect(etatDeLaPageDuPoint({ pret: true, jeton: 'j', lecture: { ok: true, point: null } })).toBe('lien-invalide');
  });

  it('ouvre la carte quand le point accepte une réponse, et la ferme sinon', () => {
    expect(etatDeLaPageDuPoint({ pret: true, jeton: 'j', lecture: ok, maintenant: MERCREDI })).toBe('ouvert');
    expect(
      etatDeLaPageDuPoint({
        pret: true,
        jeton: 'j',
        lecture: { ok: true, point: point({ status: 'expired' }) },
        maintenant: MERCREDI,
      })
    ).toBe('clos');
  });
});

describe('phraseDeLaLectureDuPoint', () => {
  it('ne nomme la connexion que hors ligne', () => {
    expect(phraseDeLaLectureDuPoint('horsLigne')).toBe(
      'Ta question n’a pas pu s’afficher. Vérifie ta connexion et réessaie.'
    );
    expect(phraseDeLaLectureDuPoint('serveur')).toBe('Ta question n’a pas pu s’afficher. Réessaie dans un instant.');
  });
});

// Relevé des mutations, le 24/10/2026 :
//   - un point répondu toujours accepté (la borne retirée) → « accepte la correction… » et « suit la bascule
//     du lundi à minuit UTC » ;
//   - « plus valable » dit avant d'être prête, sans jeton → « charge tant qu'elle n'est pas prête », seul ;
//   - la panne lue comme un lien invalide → « distingue la panne du jeton inconnu », seul ;
//   - la réponse du lien sans `trim` → « rend une des trois réponses », seul ;
//   - la connexion nommée sur une erreur du serveur → « ne nomme la connexion que hors ligne », seul ;
//   - `/point` retiré des surfaces sans compte (`src/types/session.ts`) → les deux tests de
//     `session.test.ts` qui énumèrent la liste.
// Et dans `checkin-card.tsx`, la proposition ignorée → les quatre premiers tests de « la réponse choisie
// dans l'e-mail » ; le geste parti par la session → les trois qui envoient ; le focus qui ne suit pas
// « Choisir une autre réponse » → le troisième, seul.
