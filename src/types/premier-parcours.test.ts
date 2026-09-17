import {
  etatDuPremierParcours,
  OUVERTURE_DES_DEUX_LIEUX,
  SORTIE_DES_DEUX_LIEUX,
  type EtapeDuPremierParcours,
} from '@/types/premier-parcours';

describe('etatDuPremierParcours', () => {
  // La table en entier, quatre lignes : c'est une machine à trois états plus l'absence, et chaque
  // ligne décide de deux choses. L'écrire en toutes lettres vaut mieux qu'un test par cas — ce
  // qu'on veut voir d'un coup d'œil, c'est qu'aucune combinaison n'a été oubliée.
  const table: [EtapeDuPremierParcours | null, boolean, boolean][] = [
    // étape, barre visible, carte des deux lieux
    [null, true, false],
    ['questionnaire', false, false],
    ['barre', true, true],
    ['fait', true, false],
  ];

  it.each(table)('%p → barre %p, carte %p', (etape, barreVisible, carteDesDeuxLieux) => {
    expect(etatDuPremierParcours(etape)).toEqual({ barreVisible, carteDesDeuxLieux });
  });

  // **Le cas qu'il ne faut pas rater**, et il vaut une assertion à lui : appareil neuf d'un compte
  // existant, session retrouvée par lien, installation d'avant ce chantier. La marque autorise une
  // absence de barre, elle ne la présume pas — et `null` couvre aussi le temps de la lecture, qui
  // ne doit rien faire disparaître.
  it('sans marque, la barre est là', () => {
    expect(etatDuPremierParcours(null).barreVisible).toBe(true);
  });

  // Une seule étape masque la barre, et c'est celle où le parcours est en cours. Le jour où une
  // quatrième étape s'ajoute, cette assertion dit s'il faut décider quelque chose pour elle.
  it('ne masque la barre que pendant le questionnaire et le premier plan', () => {
    const masquees = (['questionnaire', 'barre', 'fait'] as const).filter(
      (etape) => !etatDuPremierParcours(etape).barreVisible
    );
    expect(masquees).toEqual(['questionnaire']);
  });
});

describe('la carte des deux lieux', () => {
  // Elle décrit le produit, pas ce plan-ci : un chiffre ou un nom de poste en ferait une seconde
  // description des cartes posées dessous — le défaut que C5.3 vient de retirer de l'intro.
  it('ne chiffre rien et ne nomme aucun poste', () => {
    const texte = [
      OUVERTURE_DES_DEUX_LIEUX.etiquette,
      OUVERTURE_DES_DEUX_LIEUX.titre,
      OUVERTURE_DES_DEUX_LIEUX.corps,
    ].join(' ');
    expect(texte).not.toMatch(/\d/);
    expect(texte).not.toMatch(/trajet|voyage|sortie|loisir|domicile/i);
  });

  // Elle nomme les **deux** lieux et où ils sont : c'est tout son objet, et une reformulation qui
  // perdrait « en bas » perdrait la seule indication de navigation de la carte.
  it('nomme les deux lieux et où les trouver', () => {
    expect(OUVERTURE_DES_DEUX_LIEUX.corps).toMatch(/ton plan/i);
    expect(OUVERTURE_DES_DEUX_LIEUX.corps).toMatch(/ton suivi/i);
    expect(OUVERTURE_DES_DEUX_LIEUX.corps).toMatch(/en bas/i);
  });

  it('n’a qu’une sortie, et c’est « Compris »', () => {
    expect(SORTIE_DES_DEUX_LIEUX).toEqual([{ cle: 'compris', label: 'Compris', forme: 'lien' }]);
  });
});
