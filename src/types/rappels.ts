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
