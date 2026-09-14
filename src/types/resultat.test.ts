// La voix de la restitution, enfin testable (A3-17). Tant qu'elle vivait dans l'écran, elle
// était hors de portée : le fichier importe `@/lib/supabase`, ce que la convention du dépôt
// interdit à un module testé. Quatre défauts y avaient coexisté sans qu'aucun contrôle ne
// bronche, chacun à une assertion d'une ligne près.
import {
  FRANCE_AVERAGE_TRANSPORT_T,
  TARGET_2050_TRANSPORT_T,
  formatTonnesShort,
} from '@/constants/carbon-reference';
import { TRANSPORT_MODE_LABELS } from '@/constants/transport-modes';
import type { Palier } from '@/types/palier';
import {
  MODE_IDS,
  MODE_PREPOSITION,
  POSTE_EN_PHRASE,
  POSTE_SUBJECT,
  bilanSansEmissions,
  comparisonNote,
  dominantHeadline,
  dominantShareLabel,
  modeResultat,
  palierNote,
  partDuTotal,
  pourcentageDominant,
  prepositionDuMode,
  urlDePartage,
  montreMoyenneFrancaise,
  NOTE_MOBILITE_CONTRAINTE,
  type ResultatBilan,
} from '@/types/resultat';

function resultat(champs: Partial<ResultatBilan> = {}): ResultatBilan {
  return {
    total_co2_kg_year: 4200,
    dominant_poste: 'commute',
    dominant_poste_label: 'Trajet domicile-travail (Voiture seul)',
    dominant_poste_mode: 'voiture_thermique',
    dominant_poste_co2_kg_year: 2100,
    // `null` par défaut, comme un bilan calculé avant la colonne : le cas le plus neutre, celui
    // qui montre la barre de comparaison.
    mobility_constrained: null,
    ...champs,
  };
}

describe('modeResultat', () => {
  it('est « nouveau » sur le paramètre explicite du questionnaire', () => {
    expect(modeResultat('1')).toBe('nouveau');
  });

  it('est « relecture » sans paramètre — le cas d’une entrée du suivi', () => {
    expect(modeResultat(undefined)).toBe('relecture');
  });

  // Le défaut penche vers le mode sobre : une valeur inattendue ne doit pas relancer une
  // proposition de compte à quelqu'un qui consulte son historique.
  it('est « relecture » sur toute autre valeur', () => {
    for (const valeur of ['', '0', 'true', 'oui', '11']) {
      expect({ valeur, mode: modeResultat(valeur) }).toEqual({ valeur, mode: 'relecture' });
    }
  });
});

describe('MODE_PREPOSITION', () => {
  // **Le test parcourt la liste, il ne l'énumère pas.** Une assertion écrite mode par mode
  // n'aurait jamais attrapé les quatre deux-roues de la migration `20260905200000` — elle ne
  // rattrape que les modes qu'on pense déjà à nommer, donc jamais le suivant (A3-6).
  it('donne une préposition non vide à chaque mode du référentiel', () => {
    for (const modeId of MODE_IDS) {
      expect({ modeId, preposition: prepositionDuMode(modeId) }).toEqual({
        modeId,
        preposition: expect.stringMatching(/\S/),
      });
    }
  });

  it('n’a pas d’entrée que le référentiel ne connaît pas', () => {
    expect(Object.keys(MODE_PREPOSITION).sort()).toEqual([...MODE_IDS].sort());
  });

  // Tout ce qui est sélectionnable dans le questionnaire peut être le poste dominant : un mode
  // présent dans les listes de choix et absent d'ici perdrait son nom à l'écran.
  it('couvre tous les modes sélectionnables du questionnaire', () => {
    for (const modeId of Object.keys(TRANSPORT_MODE_LABELS)) {
      expect(MODE_IDS as readonly string[]).toContain(modeId);
    }
  });

  // Les quatre deux-roues manquaient, et c'est le cas où nommer le mode compte le plus : une
  // grosse moto émet une fois et demie une voiture thermique. Le vocabulaire est celui du
  // questionnaire — la personne doit se reconnaître dans la réponse qu'elle a donnée.
  it('nomme les quatre deux-roues motorisés', () => {
    expect({
      scooter_thermique: MODE_PREPOSITION.deux_roues_scooter_thermique,
      scooter_electrique: MODE_PREPOSITION.deux_roues_scooter_electrique,
      moto_petite: MODE_PREPOSITION.deux_roues_moto_petite,
      moto_grosse: MODE_PREPOSITION.deux_roues_moto_grosse,
    }).toEqual({
      scooter_thermique: 'en scooter thermique',
      scooter_electrique: 'en scooter électrique',
      moto_petite: 'en moto de petite cylindrée',
      moto_grosse: 'en moto de grosse cylindrée',
    });
  });

  // Jamais sélectionnable dans le questionnaire (c'est le TGV du poste voyages, B3.3), mais il
  // peut parfaitement être le `dominant_poste_mode` : ne pas le retirer par réflexe.
  it('garde le TGV, que le questionnaire ne propose pas', () => {
    expect(prepositionDuMode('train_longue_distance')).toBe('en TGV');
  });

  it('ne rend rien sur un mode inconnu ou absent', () => {
    expect(prepositionDuMode(null)).toBeUndefined();
    expect(prepositionDuMode('tapis_volant')).toBeUndefined();
  });
});

describe('dominantHeadline', () => {
  it('nomme le poste et le mode, à la deuxième personne', () => {
    expect(dominantHeadline(resultat({ dominant_poste: 'travel', dominant_poste_mode: 'avion_long_courrier' }))).toBe(
      'Tes voyages longue distance en avion long-courrier'
    );
  });

  it('nomme la moto, que la table oubliait', () => {
    expect(dominantHeadline(resultat({ dominant_poste_mode: 'deux_roues_moto_grosse' }))).toBe(
      'Ton trajet domicile-travail en moto de grosse cylindrée'
    );
  });

  // Bilan soumis avant les migrations de motorisation : le mode est nul, la phrase reste juste.
  it('se passe du mode quand il n’y en a pas', () => {
    expect(dominantHeadline(resultat({ dominant_poste_mode: null }))).toBe('Ton trajet domicile-travail');
  });

  // Un poste que ce module ne connaît pas retombe sur le libellé figé côté serveur, jamais sur
  // une chaîne vide.
  it('retombe sur le libellé du serveur quand le poste est inconnu', () => {
    expect(
      dominantHeadline(
        resultat({ dominant_poste: 'professionnel', dominant_poste_label: 'Déplacements professionnels', dominant_poste_mode: null })
      )
    ).toBe('Déplacements professionnels');
  });
});

describe('dominantShareLabel', () => {
  // Lu par les destinataires du lien, pas par la personne qui partage : aucun « Tes »/« Ton ».
  it('est neutre, sans pronom', () => {
    const label = dominantShareLabel(resultat({ dominant_poste: 'travel', dominant_poste_mode: 'avion_long_courrier' }));
    expect(label).toBe('Voyages longue distance en avion long-courrier');
    expect(label).not.toMatch(/\b(Tes|Ton|ta)\b/);
  });

  it('nomme aussi les deux-roues', () => {
    expect(dominantShareLabel(resultat({ dominant_poste_mode: 'deux_roues_scooter_electrique' }))).toBe(
      'Trajet domicile-travail en scooter électrique'
    );
  });
});

describe('partDuTotal et pourcentageDominant', () => {
  it('rendent la part en pourcentage', () => {
    expect(partDuTotal(2100, 4200)).toBe(50);
    expect(pourcentageDominant(resultat())).toBe(50);
  });

  // Le garde-fou n'existait qu'à un des deux endroits qui calculaient cette division : le
  // partage envoyait « NaN » dans l'URL d'un bilan à zéro (A3-12).
  it('rendent 0 et jamais NaN sur un total nul', () => {
    expect(partDuTotal(0, 0)).toBe(0);
    expect(pourcentageDominant(resultat({ total_co2_kg_year: 0, dominant_poste_co2_kg_year: 0 }))).toBe(0);
  });
});

describe('urlDePartage', () => {

  it('porte assez de décimales pour que `api/` retrouve les kilos', () => {
    // **La garde de la jumelle.** Les deux Vercel Functions appliquent `Math.round(tonnes * 1000)`
    // puis basculent sous 1 000 kg ; avec un dixième de tonne dans l'URL, un bilan de 40 kg arrivait
    // à « 0 kg CO₂e » pendant que l'écran disait « 40 kg » — les deux moitiés du même partage se
    // contredisaient. On éprouve ici la propriété dont `api/` a besoin, et non le nombre de
    // décimales : le kilo exact doit être reconstituable depuis le paramètre.
    for (const kg of [0, 40, 499, 999, 1000, 1049, 15820]) {
      const url = urlDePartage(resultat({ total_co2_kg_year: kg }), 'https://www.ramille.fr');
      const total = new URL(url).searchParams.get('total');
      expect(Math.round(Number.parseFloat(total ?? '0') * 1000)).toBe(kg);
    }
  });
  it('porte le total, le poste et la part', () => {
    const url = new URL(urlDePartage(resultat(), 'https://www.ramille.fr'));
    expect(url.pathname).toBe('/api/partage');
    expect(url.searchParams.get('total')).toBe('4.200');
    expect(url.searchParams.get('poste')).toBe('Trajet domicile-travail en voiture thermique');
    expect(url.searchParams.get('percent')).toBe('50');
  });

  it('ne met jamais « NaN » dans l’adresse d’un bilan à zéro', () => {
    const url = new URL(urlDePartage(resultat({ total_co2_kg_year: 0, dominant_poste_co2_kg_year: 0 }), 'https://www.ramille.fr'));
    expect(url.searchParams.get('percent')).toBe('0');
    expect(url.searchParams.get('total')).toBe('0.000');
  });
});

describe('bilanSansEmissions', () => {
  it('reconnaît le profil sans aucune émission', () => {
    expect(bilanSansEmissions(resultat({ total_co2_kg_year: 0 }))).toBe(true);
  });

  // Un poste à quelques dizaines de kilos n'est pas un bilan nul : c'est exactement ce que
  // l'affichage au dixième de tonne effaçait.
  it('ne confond pas un bilan très sobre avec un bilan nul', () => {
    expect(bilanSansEmissions(resultat({ total_co2_kg_year: 40 }))).toBe(false);
  });
});

describe('POSTE_EN_PHRASE', () => {
  // Un seul vocabulaire, deux casses : le jour où un libellé de poste change, les deux tables
  // doivent bouger ensemble.
  it('est POSTE_SUBJECT à la majuscule près', () => {
    expect(Object.keys(POSTE_EN_PHRASE).sort()).toEqual(Object.keys(POSTE_SUBJECT).sort());
    for (const [poste, sujet] of Object.entries(POSTE_SUBJECT)) {
      expect({ poste, phrase: POSTE_EN_PHRASE[poste] }).toEqual({
        poste,
        phrase: sujet.charAt(0).toLowerCase() + sujet.slice(1),
      });
    }
  });
});

describe('comparisonNote', () => {
  it('reconnaît d’abord celui qui est déjà sous le repère 2050', () => {
    expect(comparisonNote(resultat({ total_co2_kg_year: TARGET_2050_TRANSPORT_T * 1000 }))).toBe(
      'Tu es déjà sous la part transport compatible avec 2050.'
    );
  });

  it('ne fait pas d’un profil sous la moyenne un mauvais élève', () => {
    const note = comparisonNote(resultat({ total_co2_kg_year: FRANCE_AVERAGE_TRANSPORT_T * 1000 }));
    expect(note).toMatch(/en dessous de la moyenne française/);
    expect(note).toMatch(/comme pour tout le monde/);
  });

  // « L'essentiel se joue sur un seul poste, celui du haut » : la répartition suit l'ordre fixe
  // du questionnaire, donc « celui du haut » était toujours le domicile-travail — et la phrase
  // vit dans une autre carte que la répartition, où elle ne désignait rien (A3-10).
  it('nomme le poste dominant au lieu de le désigner par sa position', () => {
    const note = comparisonNote(resultat({ total_co2_kg_year: 15820, dominant_poste: 'travel', dominant_poste_co2_kg_year: 12000 }));
    // Le repère vient de sa source unique : un test qui le recopie tomberait le jour où la
    // ventilation du SDES est reprise, pour une raison qui n'a rien à voir avec ce qu'il teste.
    expect(note).toBe(
      `La moyenne française est de ${formatTonnesShort(FRANCE_AVERAGE_TRANSPORT_T)}. ` +
        'L’essentiel se joue sur un seul poste : tes voyages longue distance.'
    );
    expect(note).not.toMatch(/celui du haut/);
  });

  it('retombe sur le libellé du serveur quand le poste est inconnu', () => {
    const note = comparisonNote(
      resultat({ total_co2_kg_year: 15820, dominant_poste: 'professionnel', dominant_poste_label: 'Déplacements professionnels' })
    );
    expect(note).toMatch(/un seul poste : Déplacements professionnels\.$/);
  });

  // **C'est la phrase de la relecture** : l'écran n'y affiche plus de palier, donc c'est elle
  // qui parle — et rien ne suit quand on consulte son historique (A3-9, A13-14).
  it('ne promet jamais de plan, quelle que soit la branche', () => {
    for (const totalKg of [300, 2000, 15820]) {
      expect({ totalKg, note: comparisonNote(resultat({ total_co2_kg_year: totalKg })) }).not.toMatchObject({
        note: expect.stringMatching(/plan/i),
      });
    }
  });
});

describe('palierNote', () => {
  function palier(champs: Partial<Palier> = {}): Palier {
    return { targetKg: 3400, reductionKg: 800, isTarget2050: false, beyondTarget2050: false, ...champs };
  }

  // Le défaut le plus visible de tous : la marche qui sépare du repère vaut quelques dizaines
  // de kilos, et la phrase promettait littéralement zéro effort (A10-3).
  it('ne promet plus « 0,0 t CO₂e de moins » quand le repère est à portée', () => {
    const note = palierNote(palier({ reductionKg: 40, isTarget2050: true }), true);
    expect(note).toBe('Le repère 2050 est à ta portée : 40 kg CO₂e de moins sur l’année, et tu y es.');
  });

  it('nomme la marche et le plan qui suit', () => {
    expect(palierNote(palier(), true)).toBe(
      'Une marche à 800 kg CO₂e de moins sur l’année. Le plan qui suit propose de quoi la franchir.'
    );
  });

  it('situe 2050 quand le repère n’est pas à l’écran', () => {
    expect(palierNote(palier({ reductionKg: 1200 }), false)).toMatch(/2050 se joue palier après palier\.$/);
  });

  // Déjà sous le repère : registre de contribution, jamais d'exigence.
  it('change de registre pour un profil déjà sous le repère', () => {
    const note = palierNote(palier({ reductionKg: 12, beyondTarget2050: true }), true);
    expect(note).toMatch(/laisse de la marge ailleurs/);
    expect(note).toMatch(/S’il te reste de l’envie : 12 kg CO₂e de moins sur l’année\.$/);
  });

  // Aucune formulation d'échec : on ne dit jamais combien de paliers restent.
  it('ne compte jamais les paliers restants', () => {
    for (const variante of [palier(), palier({ isTarget2050: true }), palier({ beyondTarget2050: true })]) {
      for (const repereVisible of [true, false]) {
        expect(palierNote(variante, repereVisible)).not.toMatch(/palier(s)? restant|il t’en reste/i);
      }
    }
  });
});

describe('montreMoyenneFrancaise', () => {
  // **La barre ne s'affiche pas à qui vient de déclarer n'avoir aucun transport en commun** (C3.1).
  // `mobility_constrained` était calculée depuis l'increment 6 et lue par aucun écran : une moyenne
  // nationale dont on ne peut pas s'approcher est un score avec un mauvais côté, pas un repère.
  it('retire la barre quand la voiture n’est pas un choix', () => {
    expect(montreMoyenneFrancaise({ mobility_constrained: true })).toBe(false);
  });

  it('montre la barre dans tous les autres cas', () => {
    expect(montreMoyenneFrancaise({ mobility_constrained: false })).toBe(true);
  });

  // **`null` montre la barre**, et ce n'est pas un détail : les bilans calculés avant la colonne la
  // portent, et ne pas savoir n'est pas une contrainte. Traiter `null` comme vrai retirerait la
  // comparaison à tout l'historique d'avant l'increment 6.
  it('montre la barre quand on ne sait pas', () => {
    expect(montreMoyenneFrancaise({ mobility_constrained: null })).toBe(true);
  });
});

describe('comparisonNote — mobilité contrainte', () => {
  // Les deux branches qui citent la moyenne cèdent la place : garder « La moyenne française est de
  // 2,8 t » sous une carte d'où cette barre vient d'être ôtée serait la contradiction la plus
  // visible de l'écran.
  it.each([15820, 2000, 800])('ne cite pas la moyenne à %i kg', (kg) => {
    const note = comparisonNote(
      resultat({ total_co2_kg_year: kg, mobility_constrained: true, dominant_poste_co2_kg_year: kg })
    );
    expect(note).toBe(NOTE_MOBILITE_CONTRAINTE);
    expect(note).not.toMatch(/moyenne française/);
  });

  // **Sous le repère 2050, la première branche garde la main** : elle ne cite pas la moyenne, et
  // c'est la seule chose qu'il y a à dire à quelqu'un qui est déjà sous le repère — la contrainte de
  // mobilité n'a plus rien à expliquer là.
  it('laisse parler le repère 2050 quand il est déjà atteint', () => {
    const note = comparisonNote(
      resultat({ total_co2_kg_year: 400, mobility_constrained: true, dominant_poste_co2_kg_year: 400 })
    );
    expect(note).toBe('Tu es déjà sous la part transport compatible avec 2050.');
  });

  // Ni excuse, ni consolation : la phrase ne dit pas que ce n'est pas grave, et le chiffre reste
  // affiché en entier juste au-dessus.
  it('dit un fait et non une excuse', () => {
    expect(NOTE_MOBILITE_CONTRAINTE).not.toMatch(/pas grave|ce n’est pas ta faute|désolé/i);
    expect(NOTE_MOBILITE_CONTRAINTE).toContain('Le plan regarde ce qui dépend de toi.');
  });
});
