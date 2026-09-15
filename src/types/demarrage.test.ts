import { destinationDuDemarrage, lireLeBilan, type LectureDuBilan } from '@/types/demarrage';

describe('lireLeBilan', () => {
  it('une réponse du serveur est une lecture, qu’elle trouve un bilan ou non', () => {
    expect(lireLeBilan({ aUnBilan: true, enErreur: false, status: 200 })).toEqual({
      etat: 'lue',
      bilanComplete: true,
    });
    // `maybeSingle()` sans ligne rend un 200 et aucune erreur : c'est une réponse, et elle dit non.
    expect(lireLeBilan({ aUnBilan: false, enErreur: false, status: 200 })).toEqual({
      etat: 'lue',
      bilanComplete: false,
    });
  });

  /**
   * **L'état pour lequel ce module existe.** `status: 0` est ce que rend le bloc `catch` du transport
   * de `@supabase/postgrest-js` : la requête n'a jamais reçu de réponse HTTP.
   */
  it('un statut à zéro est une coupure de transport', () => {
    expect(lireLeBilan({ aUnBilan: false, enErreur: true, status: 0 })).toEqual({ etat: 'coupure' });
  });

  /**
   * **Le garde qui interdit le critère que l'audit proposait.** A1-5 recommandait de reconnaître la
   * coupure à l'absence de `code`. Trois chemins du SDK rendent une erreur **sans `code`** tout en
   * portant un statut réel — un corps non-JSON sur une réponse 2xx, un corps d'erreur illisible, un
   * 404 au corps vide. Un critère fondé sur le `code` les classerait « pas de connexion » devant un
   * serveur qui a parfaitement répondu.
   *
   * La signature de `lireLeBilan` ne reçoit d'ailleurs pas de `code` du tout, ce qui rend ce
   * mauvais critère inexprimable — mais la raison mérite d'être épinglée, pour que personne ne
   * l'ajoute.
   */
  it('une erreur sans code mais avec un statut réel reste une erreur serveur', () => {
    // Le 200 au corps non-JSON, et le 404 au corps vide : deux des trois chemins sans `code`.
    expect(lireLeBilan({ aUnBilan: false, enErreur: true, status: 200 })).toEqual({ etat: 'erreur' });
    expect(lireLeBilan({ aUnBilan: false, enErreur: true, status: 404 })).toEqual({ etat: 'erreur' });
  });

  it('un refus du serveur est une erreur, quel que soit son statut', () => {
    // 42501 — le refus de privilège qu'`anon` reçoit sur `assessments`, et qui est précisément ce
    // qui empêche une requête sans session de rendre « zéro ligne » (`v1-15` §1).
    expect(lireLeBilan({ aUnBilan: false, enErreur: true, status: 401 })).toEqual({ etat: 'erreur' });
    expect(lireLeBilan({ aUnBilan: false, enErreur: true, status: 403 })).toEqual({ etat: 'erreur' });
    expect(lireLeBilan({ aUnBilan: false, enErreur: true, status: 500 })).toEqual({ etat: 'erreur' });
  });
});

describe('destinationDuDemarrage', () => {
  const lue = (bilanComplete: boolean): LectureDuBilan => ({ etat: 'lue', bilanComplete });
  const coupure: LectureDuBilan = { etat: 'coupure' };
  const erreur: LectureDuBilan = { etat: 'erreur' };

  it('une lecture qui trouve un bilan mène au plan', () => {
    expect(destinationDuDemarrage(lue(true), { brouillon: false, marqueDeBilan: false })).toEqual({
      vers: 'plan',
    });
    // Et le brouillon ne détourne pas : qui a un bilan complété a le plan pour maison (C3.9).
    expect(destinationDuDemarrage(lue(true), { brouillon: true, marqueDeBilan: true })).toEqual({
      vers: 'plan',
    });
  });

  it('une lecture sans bilan mène à la reprise s’il y a un brouillon, sinon à l’onboarding', () => {
    expect(destinationDuDemarrage(lue(false), { brouillon: true, marqueDeBilan: false })).toEqual({
      vers: 'reprise',
    });
    expect(destinationDuDemarrage(lue(false), { brouillon: false, marqueDeBilan: false })).toEqual({
      vers: 'onboarding',
    });
  });

  /**
   * **La propriété qui rend la marque sûre, et le seul test qui la garde.** Quand le serveur a
   * répondu, c'est lui qui décide. Une marque fausse — un appareil restauré depuis une sauvegarde,
   * `allowBackup` étant vrai par défaut sur Android — ne peut donc pas contredire la vérité : elle
   * n'est lue que là où l'on ne sait rien.
   *
   * Si cette assertion tombe un jour, c'est que quelqu'un a fait de la marque une source de vérité,
   * et elle sera fausse.
   */
  it('la marque n’est jamais lue quand le serveur a répondu', () => {
    expect(destinationDuDemarrage(lue(false), { brouillon: false, marqueDeBilan: true })).toEqual({
      vers: 'onboarding',
    });
  });

  it('un refus du serveur mène à l’écran technique, marque ou pas', () => {
    expect(destinationDuDemarrage(erreur, { brouillon: false, marqueDeBilan: true })).toEqual({
      vers: 'echec',
    });
    expect(destinationDuDemarrage(erreur, { brouillon: true, marqueDeBilan: false })).toEqual({
      vers: 'echec',
    });
  });

  /**
   * **Hors ligne, le brouillon passe devant la marque**, à l'inverse de la règle en ligne. Ce n'est
   * pas une incohérence : le questionnaire se remplit sans réseau, le plan non. Router vers le plan
   * retirerait à la personne la seule chose qu'elle pouvait faire — et c'est déjà ce que le code
   * fait aujourd'hui, donc l'inverser serait une régression.
   */
  it('une coupure avec un brouillon mène à la reprise, même avec la marque', () => {
    expect(destinationDuDemarrage(coupure, { brouillon: true, marqueDeBilan: true })).toEqual({
      vers: 'reprise',
    });
    expect(destinationDuDemarrage(coupure, { brouillon: true, marqueDeBilan: false })).toEqual({
      vers: 'reprise',
    });
  });

  /**
   * **Le défaut que ce chantier ferme.** Sans marque, cette branche levait et l'app entière
   * s'arrêtait sur un écran technique en anglais — pour toute personne ayant déjà soumis un bilan,
   * puisque son brouillon a été effacé à la soumission.
   */
  it('une coupure sans brouillon mène au plan si la marque est là', () => {
    expect(destinationDuDemarrage(coupure, { brouillon: false, marqueDeBilan: true })).toEqual({
      vers: 'plan',
    });
  });

  /**
   * Et sans marque, l'onboarding — jamais l'écran d'échec. Il n'affirme rien sur les données de la
   * personne, il marche hors ligne de bout en bout, il mène au questionnaire, et il porte « J'ai
   * déjà un compte » : le recours du seul cas où l'absence de marque trompe.
   */
  it('une coupure sans brouillon ni marque mène à l’onboarding', () => {
    expect(destinationDuDemarrage(coupure, { brouillon: false, marqueDeBilan: false })).toEqual({
      vers: 'onboarding',
    });
  });
});
