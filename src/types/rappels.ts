/**
 * La résolution du canal de rappel — module **pur**, sans import de `@/lib/supabase`
 * (règle du CLAUDE.md : un module testé qui l'importe fait échouer toute la suite).
 *
 * **Cette table de vérité est écrite deux fois**, et c'est assumé : ici pour ce que la carte
 * d'attente et « Toi » affichent, et en SQL dans `reminder_channel_for()` pour ce qui part
 * vraiment (migration `20260907230000_rappels_canal.sql`). Un test de chaque côté épingle
 * exactement les mêmes six lignes — c'est le seul garde-fou contre le jour où l'une bouge
 * seule, même risque que `estimate_action_savings` / `assessment_results`.
 *
 * Le serveur ne connaît pas la permission Android : il connaît **l'existence d'un jeton
 * actif**, qui en est la trace. Le client connaît les deux et n'affiche jamais autre chose
 * que ce que le serveur fera.
 *
 * Réf. docs/architecture/v1-12-rappels.md §3.
 */

/** Ce que la personne a choisi — `profiles.reminder_channel`. */
export type CanalPrefere = 'push' | 'email' | 'none';

/** Ce qui partira vraiment au prochain point. */
export type CanalEffectif = 'push' | 'email' | 'aucun';

export type EtatDesRappels = {
  prefere: CanalPrefere;
  /** Un jeton d'appareil non désactivé existe côté serveur. */
  jetonActif: boolean;
  /** Compte rattaché **et** email confirmé — les deux, jamais l'un sans l'autre. */
  emailPossible: boolean;
};

/**
 * La table du §3, dans l'ordre où elle se lit :
 *
 * | Préférence | Jeton actif | Email possible | Canal effectif |
 * | --- | --- | --- | --- |
 * | `none`  | —   | —   | aucun |
 * | `push`  | oui | —   | push  |
 * | `push`  | non | oui | email |
 * | `push`  | non | non | aucun |
 * | `email` | —   | oui | email |
 * | `email` | —   | non | aucun |
 *
 * **La préférence ne se dégrade jamais d'elle-même** : un `push` sans jeton rend `email`
 * ici, mais reste `push` en base. C'est ce qui fait que rouvrir les notifications dans les
 * réglages du téléphone suffit à faire repartir la notification, sans rien retoucher.
 */
export function canalEffectif({ prefere, jetonActif, emailPossible }: EtatDesRappels): CanalEffectif {
  if (prefere === 'none') return 'aucun';
  if (prefere === 'push' && jetonActif) return 'push';
  return emailPossible ? 'email' : 'aucun';
}

/** Sur web il n'y a pas de push en V1 : la ligne n'existe pas, il n'y a rien à expliquer. */
export type Plateforme = 'natif' | 'web';

export type LigneDeReglage = {
  canal: CanalPrefere;
  titre: string;
  /** Le détail sous le titre : l'adresse, le rythme, ou ce qui manque pour que ça marche. */
  detail: string;
  /**
   * Faux seulement pour l'email sans compte : choisir « notification » reste possible même
   * après un refus, justement parce que la préférence ne se dégrade pas — c'est la porte
   * qu'on laisse ouverte.
   */
  choisissable: boolean;
  choisi: boolean;
};

/**
 * Les lignes du réglage de « Toi » (canvas `Toi.dc.html`), pour tout le monde — sessions
 * anonymes comprises, puisque le push n'a pas besoin de compte.
 *
 * Les indisponibilités **disent pourquoi**. Une ligne grisée sans raison laisse croire à une
 * panne ; « Rattache un compte pour l'activer » est une porte, pas un mur.
 */
export function lignesDeReglage(
  etat: EtatDesRappels & { plateforme: Plateforme; email: string | null }
): LigneDeReglage[] {
  const { prefere, jetonActif, emailPossible, plateforme, email } = etat;

  const notification: LigneDeReglage = {
    canal: 'push',
    titre: 'Par notification sur ce téléphone',
    detail: jetonActif
      ? 'Le matin où la question s’ouvre.'
      : 'Coupées dans les réglages de ce téléphone.',
    choisissable: true,
    choisi: prefere === 'push',
  };

  const courriel: LigneDeReglage = {
    canal: 'email',
    titre: 'Par email',
    detail: emailPossible && email ? `À ${email}.` : 'Rattache un compte pour l’activer.',
    choisissable: emailPossible,
    choisi: prefere === 'email',
  };

  const aucun: LigneDeReglage = {
    canal: 'none',
    titre: 'Sans rappel',
    detail: 'On se retrouve dans l’app, à chaque point.',
    choisissable: true,
    choisi: prefere === 'none',
  };

  return plateforme === 'web' ? [courriel, aucun] : [notification, courriel, aucun];
}

// ─────────────────────────────────────────────────────────────────────────────────────────
// La feuille et la carte d'attente (v1-12 §6.1 et §6.2).
// ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * Quelle boucle concerne la personne, donc quel jour Ramille peut nommer. Hebdomadaire dès
 * qu'un poste domicile-travail existe (le point du lundi est alors généré pour elle),
 * mensuelle sinon. Le prochain contact est celui qui vient en premier.
 */
export type Boucle = 'hebdo' | 'mensuel';

/** L'état de la permission système, tel que le téléphone le rapporte. */
export type Permission =
  /** Jamais demandée, ou refusée une seule fois : un dialogue peut encore s'ouvrir. */
  | 'demandable'
  /** Accordée. Sur Android 12 et avant, c'est l'état de départ. */
  | 'accordee'
  /** Refusée définitivement (deux refus), ou coupée dans les réglages du téléphone. */
  | 'fermee';

/**
 * La feuille ne s'ouvre **qu'une fois par appareil**, juste après « C'est noté ». C'est une
 * cérémonie assumée pour la première fois, pas un passage obligé à chaque engagement — après,
 * c'est « Toi » qui porte le réglage.
 *
 * Sur web elle ne s'ouvre que si un compte est rattaché : sans push ni adresse, il n'y aurait
 * rien à choisir, et la carte d'attente dit déjà l'essentiel.
 */
export function doitProposerLaFeuille({
  plateforme,
  emailPossible,
  dejaProposee,
}: {
  plateforme: Plateforme;
  emailPossible: boolean;
  dejaProposee: boolean;
}): boolean {
  if (dejaProposee) return false;
  return plateforme === 'natif' || emailPossible;
}

/**
 * Un seul bouton, trois libellés. Il **n'annonce un dialogue système que s'il va vraiment
 * s'en ouvrir un** : promettre une boîte qui ne vient pas, ou en ouvrir une sans prévenir,
 * sont deux façons de perdre la confiance au seul moment où elle compte.
 */
export function libelleBouton(canal: CanalPrefere, permission: Permission): string {
  if (canal === 'none') return 'Continuer sans rappel';
  if (canal === 'email') return 'C’est bon';
  return permission === 'demandable' ? 'Autoriser les notifications' : 'C’est bon';
}

export type CarteAttente = {
  /** La ligne de Ramille, toujours issue de `RAMILLE` — jamais écrite dans un écran. */
  cle: 'attenteSigneHebdo' | 'attenteSigneMensuel' | 'attenteIciHebdo' | 'attenteIciMensuel';
  /** Ce qui précise le canal. Du produit, pas d'elle : une adresse peut porter un chiffre. */
  detail: string | null;
};

/**
 * Ce qui remplace « Rien à rattraper. » sur le plan quand aucun point n'attend de réponse.
 *
 * Deux principes que le canvas a fixés et qu'il ne faut pas relâcher : Ramille **dit
 * l'attente, pas le vide** ; et l'absence de rappel n'est jamais présentée comme une
 * punition — elle revient *ici* de toute façon, c'est l'app qui porte le rendez-vous.
 *
 * Le cas du refus est celui qu'on oublie : avec un compte, l'email prend le relais tout seul
 * et la carte le dit ; sans compte, elle nomme les deux portes **une fois**, sans insister.
 */
export function carteAttente({
  boucle,
  email,
  ...etat
}: EtatDesRappels & { boucle: Boucle; email: string | null }): CarteAttente {
  const canal = canalEffectif(etat);
  const hebdo = boucle === 'hebdo';
  const coupees = etat.prefere === 'push' && !etat.jetonActif;

  if (canal === 'push') {
    return {
      cle: hebdo ? 'attenteSigneHebdo' : 'attenteSigneMensuel',
      detail: 'Par notification sur ce téléphone.',
    };
  }

  if (canal === 'email') {
    return {
      cle: hebdo ? 'attenteSigneHebdo' : 'attenteSigneMensuel',
      detail: coupees
        ? `Par email, à ${email} — les notifications sont coupées sur ce téléphone.`
        : `Par email, à ${email}.`,
    };
  }

  return {
    cle: hebdo ? 'attenteIciHebdo' : 'attenteIciMensuel',
    detail: coupees
      ? 'Les notifications sont coupées sur ce téléphone. Tu peux les rouvrir dans ses réglages, ou rattacher un compte pour l’email.'
      : null,
  };
}
