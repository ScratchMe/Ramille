/**
 * Répondre au point depuis l'e-mail — étape 6b de `v1-35` (24/10/2026), les dérivations de la page `/point`.
 *
 * Trois choses gardées : **la réponse du lien** (une des trois, sinon aucune), **le jeton retenu** (celui du
 * lien, ou celui de l'onglet sur un rechargement, jamais sur un lien abîmé), et **l'état de la page**, qui ne
 * dit jamais « plus valable » avant d'avoir cherché le jeton, ni sur une panne — et dont la borne vient du
 * serveur (`ouvert`), sans copie ici.
 *
 * Éprouvé en le cassant, le 24/10/2026 — voir le relevé au pied.
 */
import {
  etatDeLaPageDuPoint,
  jetonDuPoint,
  phraseDeLaLectureDuPoint,
  reponseDuLien,
  type PointDuLien,
} from '@/types/reponse-par-le-lien';

const JETON = '3bb3de17-8df3-4910-9e77-1381d9ee90f7';
const AUTRE = '766ae1bd-4966-43f8-8d1a-9f6a35dfd5b9';

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
  ouvert: true,
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

describe('jetonDuPoint', () => {
  it('prend le jeton du lien', () => {
    expect(jetonDuPoint(JETON, JETON, AUTRE)).toBe(JETON);
  });

  it('sans paramètre dans l’adresse — un rechargement —, retrouve celui de l’onglet', () => {
    expect(jetonDuPoint(undefined, null, JETON)).toBe(JETON);
    expect(jetonDuPoint(undefined, null, 'pas-un-uuid')).toBeNull();
    expect(jetonDuPoint(undefined, null, null)).toBeNull();
  });

  // Un lien abîmé ne lit pas le point d'un autre e-mail, avec la réponse du lien touché.
  it('sur un lien abîmé, ne retombe jamais sur le jeton gardé d’un autre e-mail', () => {
    expect(jetonDuPoint('3bb3de17-8df3', null, AUTRE)).toBeNull();
    expect(jetonDuPoint('', null, AUTRE)).toBeNull();
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

  it('ouvre la carte quand le serveur dit le point ouvert, et la ferme sinon — sans borne à lui', () => {
    expect(etatDeLaPageDuPoint({ pret: true, jeton: 'j', lecture: ok })).toBe('ouvert');
    expect(
      etatDeLaPageDuPoint({
        pret: true,
        jeton: 'j',
        lecture: { ok: true, point: point({ ouvert: false, status: null }) },
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

// Relevé des mutations, le 24/10/2026, rejoué après la contre-lecture du même soir :
//   - « plus valable » dit avant d'être prête, sans jeton → « charge tant qu'elle n'est pas prête », seul ;
//   - la panne lue comme un lien invalide → « distingue la panne du jeton inconnu », seul ;
//   - l'état ouvert sans lire `ouvert` (toujours « ouvert ») → « ouvre la carte… et la ferme sinon », seul ;
//   - `jetonDuPoint` qui retombe sur le jeton gardé quand le lien est abîmé (la règle de `jetonARetenir`) →
//     « sur un lien abîmé… », seul ;
//   - la réponse du lien sans `trim` → « rend une des trois réponses », seul ;
//   - la connexion nommée sur une erreur du serveur → « ne nomme la connexion que hors ligne », seul ;
//   - `/point` retiré des surfaces sans compte (`src/types/session.ts`) → les deux tests de
//     `session.test.ts` qui énumèrent la liste.
// Et dans `checkin-card.tsx` : voir le relevé de `checkin-card.test.tsx`, « la réponse choisie dans
// l'e-mail ».
