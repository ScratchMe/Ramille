import { ETE_2026, FAITS_DE_L_ETE, VAGUES_DE_CHALEUR_2026 } from '@/constants/climat';
import { calendrierDeLaSaison, compteDeLaSaison, joursDe } from '@/types/ete';

// Éprouvé en le cassant, le 31/10/2026 : la fin de la deuxième vague recopiée « 2026-07-18 » fait tomber
// « les trois vagues font les 53 jours » (52) et les rangs, qui s'arrêtent à 51 ; le lundi compté depuis le dimanche (`getUTCDay()` sans le
// décalage) fait tomber « juin commence un lundi » ; le rang incrémenté sur chaque jour, vague ou non,
// fait tomber « les rangs suivent l'ordre de l'été ».

describe('le calendrier de l’été 2026', () => {
  const mois = calendrierDeLaSaison(ETE_2026, VAGUES_DE_CHALEUR_2026);

  it('les trois vagues recopiées du bilan font les 53 jours qu’il annonce, sur 92', () => {
    expect(compteDeLaSaison(mois)).toEqual({
      jours: 92,
      enVague: FAITS_DE_L_ETE.joursDeVagueDeChaleur,
    });
  });

  it('trois mois, juin, juillet et août', () => {
    expect(mois.map((m) => m.nom)).toEqual(['juin', 'juillet', 'août']);
  });

  it('juin commence un lundi, juillet un mercredi, août un samedi', () => {
    // Le 1er juin 2026 est un lundi : aucune case vide. Le 1er juillet, un mercredi : deux. Le 1er août,
    // un samedi : cinq.
    expect(mois.map((m) => m.cases.findIndex((c) => c !== null))).toEqual([0, 2, 5]);
  });

  it('les bornes des vagues sont des jours de vague, la veille et le lendemain n’en sont pas', () => {
    const jours = new Map(
      mois.flatMap((m) => m.cases).flatMap((c) => (c ? [[c.date, c.enVague] as const] : []))
    );
    for (const vague of VAGUES_DE_CHALEUR_2026) {
      expect(jours.get(vague.debut)).toBe(true);
      expect(jours.get(vague.fin)).toBe(true);
    }
    expect(jours.get('2026-06-16')).toBe(false);
    expect(jours.get('2026-07-01')).toBe(false);
    expect(jours.get('2026-08-20')).toBe(false);
  });

  it('les rangs suivent l’ordre de l’été, de 0 à 52, et un jour hors vague n’en a pas', () => {
    const cases = mois.flatMap((m) => m.cases).filter((c) => c !== null);
    expect(cases.filter((c) => c.enVague).map((c) => c.rangDansLesVagues)).toEqual(
      Array.from({ length: 53 }, (_, i) => i)
    );
    expect(cases.filter((c) => !c.enVague).every((c) => c.rangDansLesVagues === null)).toBe(true);
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
