import { paraitChoisie } from '@/types/ligne-de-canal';
import { lignesDeReglage } from '@/types/rappels';

// Éprouvé en le cassant le 24/09/2026, deux mutations : `paraitChoisie` réduit à `ligne.choisi`
// fait tomber les deux premiers tests, et eux seuls ; réduit à `false`, le troisième seulement —
// c'est lui qui garde l'autre moitié, qu'une ligne choisissable et choisie reste cochée.
describe('paraitChoisie', () => {
  it('une ligne désactivée ne paraît jamais choisie, même quand elle porte la préférence', () => {
    expect(paraitChoisie({ choisi: true, choisissable: false })).toBe(false);
  });

  it('sur « Toi », sans compte et avec la préférence par défaut, aucune ligne ne paraît choisie', () => {
    // La préférence en base vaut `email` par défaut : sans adresse, la ligne « Par email » est la
    // ligne choisie **et** la seule qui ne se choisit pas. Le canal effectif est `aucun`, et cocher
    // « Sans rappel » à la place affirmerait un choix que personne n'a fait.
    const lignes = lignesDeReglage({
      prefere: 'email',
      jetonActif: false,
      emailPossible: false,
      email: null,
      plateforme: 'natif',
      permission: 'demandable',
    });
    expect(lignes.find((l) => l.canal === 'email')).toMatchObject({ choisi: true, choisissable: false });
    expect(lignes.filter(paraitChoisie)).toEqual([]);
  });

  it('une ligne choisissable et choisie paraît choisie, et elle seule', () => {
    const lignes = lignesDeReglage({
      prefere: 'email',
      jetonActif: false,
      emailPossible: true,
      email: 'camille@exemple.fr',
      plateforme: 'natif',
      permission: 'accordee',
    });
    expect(lignes.filter(paraitChoisie).map((l) => l.canal)).toEqual(['email']);
    expect(paraitChoisie({ choisi: false, choisissable: true })).toBe(false);
  });
});
