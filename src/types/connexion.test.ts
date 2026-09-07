import {
  adresseDejaRattachee,
  adresseSemblePlausible,
  estLimiteDEnvoi,
  identiteDejaRattachee,
} from './connexion';

describe('estLimiteDEnvoi', () => {
  it('reconnaît la limite à son code, pas à son message', () => {
    // Le message réel de Supabase ne contient pas le mot « rate » : une détection par
    // message ne voyait rien (cf. commentaire du module).
    expect(
      estLimiteDEnvoi({
        code: 'over_email_send_rate_limit',
        status: 429,
        message: 'For security purposes, you can only request this after 52 seconds.',
      })
    ).toBe(true);
  });

  it('retombe sur le 429 si le code manque', () => {
    expect(estLimiteDEnvoi({ status: 429 })).toBe(true);
  });

  it('ne confond pas la limite avec une adresse inconnue', () => {
    // 422 `otp_disabled` : `shouldCreateUser: false` a fait son travail — ce n'est pas une
    // panne, et surtout pas un message distinct à afficher.
    expect(estLimiteDEnvoi({ code: 'otp_disabled', status: 422 })).toBe(false);
    expect(estLimiteDEnvoi(null)).toBe(false);
  });
});

describe('adresseDejaRattachee', () => {
  it('ne réagit qu’au code email_exists', () => {
    expect(adresseDejaRattachee({ code: 'email_exists', status: 422 })).toBe(true);
    expect(adresseDejaRattachee({ code: 'otp_disabled', status: 422 })).toBe(false);
    expect(adresseDejaRattachee(null)).toBe(false);
  });
});

describe('identiteDejaRattachee', () => {
  // Code vérifié contre la liste officielle de l'API Auth le 07/09/2026 :
  // « The identity to which the API relates is already linked to a user. »
  it('ne réagit qu’au code identity_already_exists', () => {
    expect(identiteDejaRattachee({ code: 'identity_already_exists', status: 422 })).toBe(true);
    expect(identiteDejaRattachee(null)).toBe(false);
  });

  // Deux voisins qu'il serait tentant de confondre : `identity_not_found` est l'inverse
  // exact, et `email_exists` appartient au chemin email, qui a déjà son aiguillage.
  it('ne confond pas avec les codes voisins', () => {
    expect(identiteDejaRattachee({ code: 'identity_not_found' })).toBe(false);
    expect(identiteDejaRattachee({ code: 'email_exists' })).toBe(false);
    expect(identiteDejaRattachee({ code: 'manual_linking_disabled' })).toBe(false);
  });

  // La détection par message est ce qui a déjà échoué en silence pour la limite d'envoi.
  it('ignore le message, même s’il décrit exactement le cas', () => {
    expect(
      identiteDejaRattachee({ message: 'The identity is already linked to a user.' })
    ).toBe(false);
  });
});

describe('adresseSemblePlausible', () => {
  it('accepte les adresses ordinaires', () => {
    for (const valeur of ['a@b.fr', 'prenom.nom@exemple.co.uk', ' a@b.fr ', 'a+tag@b.io']) {
      expect({ valeur, ok: adresseSemblePlausible(valeur) }).toEqual({ valeur, ok: true });
    }
  });

  it('refuse ce qui ne peut pas être une adresse', () => {
    for (const valeur of ['', '   ', 'sansarobase.fr', 'a@b', 'a@b.', '@b.fr', 'a@', 'a b@c.fr', 'a@b@c.fr']) {
      expect({ valeur, ok: adresseSemblePlausible(valeur) }).toEqual({ valeur, ok: false });
    }
  });
});
