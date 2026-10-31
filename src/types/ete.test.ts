import { ETE_2026, FAITS_DE_L_ETE, VAGUES_DE_CHALEUR_2026 } from '@/constants/climat';
import { compteDeLaSaison, joursDe, moisDeLaSaison, periodeEnMots } from '@/types/ete';

// Éprouvé en le cassant, le 31/10/2026 : la fin de la deuxième vague recopiée « 2026-07-18 » fait tomber « les
// trois vagues font les 53 jours » (52) et les rangs, qui s'arrêtent à 51 ; le rang incrémenté sur chaque jour,
// vague ou non, fait tomber « les rangs suivent l'ordre de l'été » ; le mois répété sans condition fait tomber
// « une période en mots ».

describe('l’été 2026', () => {
  const mois = moisDeLaSaison(ETE_2026, VAGUES_DE_CHALEUR_2026);
  const jours = mois.flatMap((m) => m.jours);

  it('les trois vagues recopiées du bilan font les 53 jours qu’il annonce, sur 92', () => {
    expect(compteDeLaSaison(mois)).toEqual({ jours: 92, enVague: FAITS_DE_L_ETE.joursDeVagueDeChaleur });
  });

  it('trois mois, juin, juillet et août, de 30, 31 et 31 jours', () => {
    expect(mois.map((m) => [m.nom, m.jours.length])).toEqual([
      ['juin', 30],
      ['juillet', 31],
      ['août', 31],
    ]);
  });

  it('les bornes des vagues sont des jours de vague, la veille et le lendemain n’en sont pas', () => {
    const enVague = new Map(jours.map((j) => [j.date, j.enVague]));
    for (const vague of VAGUES_DE_CHALEUR_2026) {
      expect(enVague.get(vague.debut)).toBe(true);
      expect(enVague.get(vague.fin)).toBe(true);
    }
    expect(enVague.get('2026-06-16')).toBe(false);
    expect(enVague.get('2026-07-01')).toBe(false);
    expect(enVague.get('2026-08-20')).toBe(false);
  });

  it('les rangs suivent l’ordre de l’été, de 0 à 52, et un jour hors vague n’en a pas', () => {
    expect(jours.filter((j) => j.enVague).map((j) => j.rangDansLesVagues)).toEqual(
      Array.from({ length: 53 }, (_, i) => i)
    );
    expect(jours.filter((j) => !j.enVague).every((j) => j.rangDansLesVagues === null)).toBe(true);
  });
});

describe('une période en mots', () => {
  it('le mois ne se répète pas quand les deux bornes le partagent', () => {
    expect(VAGUES_DE_CHALEUR_2026.map((v) => periodeEnMots(v.debut, v.fin))).toEqual([
      'du 17 au 30 juin',
      'du 4 au 19 juillet',
      'du 28 juillet au 19 août',
    ]);
  });

  it('le premier du mois s’écrit « 1er »', () => {
    expect(periodeEnMots('2026-06-01', '2026-08-31')).toBe('du 1er juin au 31 août');
  });
});

describe('joursDe', () => {
  it('compte les deux bornes, et traverse un changement de mois', () => {
    expect(joursDe('2026-06-29', '2026-07-02')).toEqual([
      '2026-06-29',
      '2026-06-30',
      '2026-07-01',
      '2026-07-02',
    ]);
  });
});
