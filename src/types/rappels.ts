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
 *
 * Ce module porte aussi ce que l'écran **présélectionne** : une ligne non choisissable ne doit
 * jamais l'être, sans quoi la feuille se referme sur un canal qui ne partira pas.
 */

/** Ce que la personne a choisi — `profiles.reminder_channel`. */
export type CanalPrefere = 'push' | 'email' | 'none';

/** Ce qui partira vraiment au prochain point. */
export type CanalEffectif = 'push' | 'email' | 'aucun';

export type EtatDesRappels = {
  prefere: CanalPrefere;
  /**
   * Le jeton de **cet** appareil existe côté serveur et n'est pas désactivé. Pas « un jeton de
   * cette personne » : elle peut en avoir plusieurs, et l'écran dit « sur ce téléphone »
   * (`loadReminderPrefs` filtre sur le jeton mémorisé à l'enregistrement).
   */
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
  /**
   * Le lien « Ouvrir les réglages du téléphone » du canvas. Vrai dans le seul état où il mène
   * quelque part : dire que les notifications sont coupées sans donner la porte laisse
   * chercher un réglage à trois niveaux de menu.
   */
  lienVersLesReglages: boolean;
  /**
   * La porte « Rattacher un compte », sous la ligne « Par email » et nulle part ailleurs.
   *
   * **C'est le seul ajout de produit du retrait de l'interstitiel** (20/09/2026), et le seul
   * moment vraiment neuf : la feuille est le seul écran qui POSE la question à laquelle le compte
   * répond (« comment te faire signe ? »), et sa réponse était un mur — une ligne grisée, sans
   * rien à toucher. Jumelle de `lienVersLesReglages` par construction : vraie dans le seul état
   * où elle mène quelque part, et nommée sur la dérivation plutôt que testée dans l'écran.
   */
  porteVersLeCompte: boolean;
};

/**
 * Le détail de la ligne « notification » vient de la **permission système**, jamais de
 * l'existence d'un jeton.
 *
 * L'absence de jeton recouvre quatre situations qui n'appellent pas la même phrase : la
 * permission jamais demandée (état de départ d'Android 13 et plus), le refus, l'échec
 * d'enregistrement et le simulateur. Les confondre annonçait « coupées dans les réglages » à
 * quelqu'un qui n'a jamais rien refusé, et l'envoyait chercher un réglage qu'il n'a pas touché.
 * La permission, elle, est un fait de **cet** appareil — ce que le jeton n'est pas (A9-19).
 */
const DETAIL_NOTIFICATION: Record<Permission, string> = {
  accordee: 'Le matin où la question s’ouvre.',
  demandable: 'À activer en une fois.',
  fermee: 'Coupées dans les réglages du téléphone — c’est là que ça se rouvre.',
};

/**
 * Les lignes du réglage de « Toi » (canvas `Toi.dc.html`), pour tout le monde — sessions
 * anonymes comprises, puisque le push n'a pas besoin de compte.
 *
 * Les indisponibilités **disent pourquoi**. Une ligne grisée sans raison laisse croire à une
 * panne ; « Rattache un compte pour l'activer » est une porte, pas un mur.
 */
export function lignesDeReglage(
  etat: EtatDesRappels & { plateforme: Plateforme; email: string | null; permission: Permission }
): LigneDeReglage[] {
  const { prefere, emailPossible, plateforme, email, permission } = etat;

  const notification: LigneDeReglage = {
    canal: 'push',
    titre: 'Par notification sur ce téléphone',
    detail: DETAIL_NOTIFICATION[permission],
    choisissable: true,
    choisi: prefere === 'push',
    lienVersLesReglages: permission === 'fermee',
    porteVersLeCompte: false,
  };

  // **Une adresse utilisable, calculée une fois** — le détail, le choix et la porte en sortent tous
  // les trois, et c'est ce qui les empêche de se contredire : une porte sous « À camille@… »
  // proposerait de rattacher un compte à quelqu'un qui en a un, et une ligne cochable sous
  // « Rattache un compte pour l'activer » enverrait choisir un canal qui ne peut rien envoyer.
  //
  // **Il y avait deux expressions pour ce fait, pas une, et le commentaire d'avant disait le
  // contraire** (relevé en contre-lecture le 21/09/2026) : le détail et la porte lisaient
  // `emailPossible && email`, le choix lisait `emailPossible` seul. Les trois s'accordaient
  // néanmoins, mais par une coïncidence chez leur unique producteur — `loadReminderPrefs`
  // (`src/lib/notification-prefs.ts`) exige `!!user.email` pour poser `emailPossible`, et ne remplit
  // `email` que dans ce cas. Un second producteur qui poserait `emailPossible` sans adresse rendait
  // une ligne **cochable** dont le détail dit qu'elle ne marche pas. Rien n'aurait rougi : le test de
  // partition balayait bien cette combinaison, mais ne regardait pas `choisissable`.
  const adresseUtilisable = emailPossible && email ? email : null;

  const courriel: LigneDeReglage = {
    canal: 'email',
    titre: 'Par email',
    detail: adresseUtilisable ? `À ${adresseUtilisable}.` : 'Rattache un compte pour l’activer.',
    choisissable: adresseUtilisable !== null,
    choisi: prefere === 'email',
    lienVersLesReglages: false,
    porteVersLeCompte: adresseUtilisable === null,
  };

  const aucun: LigneDeReglage = {
    canal: 'none',
    titre: 'Sans rappel',
    detail: 'On se retrouve dans l’app, à chaque point.',
    choisissable: true,
    porteVersLeCompte: false,
    choisi: prefere === 'none',
    lienVersLesReglages: false,
  };

  return plateforme === 'web' ? [courriel, aucun] : [notification, courriel, aucun];
}

/**
 * Le canal que la feuille propose à l'ouverture — **jamais une ligne non choisissable**.
 *
 * La préférence en base vaut `email` par défaut (`20260907230000_rappels_canal.sql`). Sur
 * natif sans compte — le cas majoritaire, puisque le produit ne demande pas de compte — la
 * feuille présélectionnait donc une ligne grisée, s'intitulait « C'est bon » et écrivait
 * `email`, dont le canal effectif est `aucun` : la seule cérémonie du produit se terminait en
 * ne branchant rien, et la marque locale l'empêchait de revenir (A4-4).
 *
 * La règle est générale plutôt que taillée pour ce cas : on garde la préférence si sa ligne est
 * choisissable, sinon on prend la première qui l'est — donc la notification sur natif, l'email
 * sur web. Un canal ajouté demain y entre sans rien à retoucher.
 */
export function canalPreselectionne(
  etat: EtatDesRappels & { plateforme: Plateforme; email: string | null; permission: Permission }
): CanalPrefere {
  const lignes = lignesDeReglage(etat);
  const voulue = lignes.find((ligne) => ligne.canal === etat.prefere);
  if (voulue?.choisissable) return voulue.canal;
  return lignes.find((ligne) => ligne.choisissable)?.canal ?? 'none';
}

// ─────────────────────────────────────────────────────────────────────────────────────────
// La feuille et la carte d'attente (v1-12 §6.1 et §6.2).
// ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * Quelle boucle nomme le jour que Ramille annonce. Hebdomadaire dès qu'un poste
 * domicile-travail existe (le point du lundi est alors généré), mensuelle sinon.
 *
 * **Deux questions distinctes s'y répondent, et elles n'ont pas la même source** (relevé en
 * recette le 14/09/2026). La **carte d'attente** annonce le prochain contact, quel qu'en soit le
 * sujet : elle se dérive de la personne — a-t-elle un poste domicile-travail, donc un point le
 * lundi. La **feuille ouverte après « C'est noté »**, elle, promet un contact *sur l'action qu'on
 * vient d'engager* (« Lundi, je reviens te demander si tu l'as faite ») : elle se dérive du
 * **poste de cette action**, par `boucleDeLAction`.
 *
 * Les confondre affiche une promesse fausse, et c'est ce qui a été trouvé sur appareil : quelqu'un
 * qui a un trajet domicile-travail **et** s'engage sur un vol s'entendait promettre le lundi, alors
 * que le point du lundi s'apparie sur le poste `commute` (C2.1) et ne demandera jamais rien sur son
 * vol. Le chemin a été constaté en base le même jour : le point hebdomadaire est bien sorti en
 * question générique.
 */
export type Boucle = 'hebdo' | 'mensuel';

/**
 * La boucle qui interrogera une action, d'après le poste de son gabarit.
 *
 * Miroir de l'appariement que fait la génération du point (C2.1) : la boucle hebdomadaire ne
 * retient qu'une action du poste `commute`, la mensuelle celle du poste `extras` du bilan. Un
 * poste absent prend la branche mensuelle, par le même repli que `intentionTimingsForPoste` —
 * mieux vaut la formulation qui n'engage pas un jour précis.
 */
export function boucleDeLAction(poste: string | null): Boucle {
  return poste === 'commute' ? 'hebdo' : 'mensuel';
}

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

/**
 * La porte que la carte d'attente ouvre, quand sa phrase en demande une.
 *
 * **Une phrase qui dit quoi faire et n'offre aucun moyen de le faire est un mur** — et le dépôt
 * écrivait déjà le contraire, dans le commentaire de `lignesDeReglage` juste au-dessus : « une
 * porte, pas un mur ». Sur « Toi » c'était vrai, on y est déjà ; sur le plan, la même phrase
 * n'avait aucune suite et le seul chemin était l'icône de compte en haut à droite, que rien
 * n'explique (13.4 de la recette web du 16/09/2026).
 *
 * La forme est celle du lien « Ouvrir les réglages du téléphone » de `LigneDeReglage` : elle
 * n'existe **que dans l'état qui la réclame**, et l'écran la rend **sous la ligne qui la porte**
 * — détachée, elle se lirait comme appartenant à autre chose.
 *
 * `vers` est volontairement un littéral et non un type de route d'Expo Router : ce module est
 * pur et testé, et rien n'y importe de la navigation. La destination est « Toi » et **jamais**
 * `/connexion` — y arriver depuis le plan imposerait une provenance neuve dans
 * `SOURCES_CONNEXION`, alors que « Toi » en a déjà une ; et le dépôt garde la trace du jour où
 * une provenance non reconnue s'est fait réécrire en `resultat_transition`, gonflant exactement
 * le chiffre auquel on voulait la comparer.
 */
export type PorteDeLaCarte = { libelle: string; vers: '/compte' };

/**
 * La seule porte que cette carte sache ouvrir, et c'est assez.
 *
 * L'état « refus sans compte » nomme **deux** remèdes dans sa phrase — rouvrir les notifications
 * du téléphone, ou rattacher un compte — mais le premier n'est pas une route : c'est un réglage
 * système, dont le lien vit dans `lignesDeReglage`, c'est-à-dire précisément sur l'écran où
 * celle-ci mène. Une porte qui donne sur les deux remèdes vaut mieux que deux liens sur une
 * carte qui doit rester calme.
 */
const PORTE_VERS_LE_COMPTE: PorteDeLaCarte = { libelle: 'Rattacher un compte', vers: '/compte' };

export type CarteAttente = {
  /** La ligne de Ramille, toujours issue de `RAMILLE` — jamais écrite dans un écran. */
  cle: 'attenteSigneHebdo' | 'attenteSigneMensuel' | 'attenteIciHebdo' | 'attenteIciMensuel';
  /** Ce qui précise le canal. Du produit, pas d'elle : une adresse peut porter un chiffre. */
  detail: string | null;
  /**
   * La porte, ou `null` quand il n'y a rien à ouvrir.
   *
   * L'invariant, et c'est lui qu'un test épingle plutôt que la liste des branches : **elle se
   * rend exactement là où le canal effectif est `aucun` et où la carte dit quelque chose.**
   * Aucun canal veut dire qu'aucune adresse ne peut recevoir le mot, donc qu'un compte est
   * précisément ce qui manque ; et ne rien dire (l'enregistrement raté, qui se répare au
   * prochain lancement) veut dire qu'il n'y a rien à réparer à la main. Écrit ainsi, il survit
   * à une reformulation des six phrases.
   */
  action: PorteDeLaCarte | null;
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
 *
 * **Les six lignes du §3 sont ici, et la sixième a manqué longtemps** : préférence `email`
 * sans email possible, c'est-à-dire l'état par défaut de toute session anonyme. La carte
 * disait « On se retrouve ici lundi. » sans détail, donc rien nulle part n'apprenait qu'aucun
 * rappel ne partirait (A4-5). Le canal, lui, était juste des deux côtés : l'écart portait sur
 * ce qui est *dit*, et c'est exactement ce que la paire de tests existe pour attraper.
 *
 * **La permission est ici pour la même raison qu'elle est dans `lignesDeReglage` : l'absence
 * de jeton n'accuse personne.** Depuis que `jetonActif` ne vaut plus vrai sur la seule
 * permission accordée, elle est fausse aussi quand l'enregistrement a échoué (pas
 * d'identifiants FCM, pas de réseau, simulateur) — et la carte disait alors « les
 * notifications sont coupées sur ce téléphone » à qui venait d'appuyer sur « Autoriser ». Le
 * canal annoncé, lui, reste juste dans ce cas : c'est l'explication qui était fausse, pas le
 * repli. On ne nomme donc les réglages du téléphone que là où quelqu'un les a vraiment fermés
 * (A4-15, point 2).
 */
export function carteAttente({
  boucle,
  email,
  permission,
  plateforme,
  ...etat
}: EtatDesRappels & {
  boucle: Boucle;
  email: string | null;
  permission: Permission;
  plateforme: Plateforme;
}): CarteAttente {
  const canal = canalEffectif(etat);
  const hebdo = boucle === 'hebdo';
  // **`plateforme` est ce qui empêche d'accuser un navigateur de bureau.** Sur web
  // `lirePermission()` rend toujours `fermee`, et depuis que `jetonActif` est un fait de **cet**
  // appareil, il y est toujours faux : sans cette condition, quelqu'un dont la préférence est
  // `push` et dont l'email n'est pas utilisable lisait « les notifications sont coupées sur ce
  // téléphone… tu peux les rouvrir dans ses réglages » sur une machine où il n'y a ni téléphone ni
  // réglage à ouvrir — pendant que les notifications de son téléphone marchent très bien. Avant
  // que le jeton devienne un fait local, ce texte ne sortait pas : la bascule par appareil a
  // ouvert ce cas, et c'est le genre de phrase qui décrédibilise tout le reste de l'écran.
  const coupees =
    plateforme === 'natif' &&
    etat.prefere === 'push' &&
    !etat.jetonActif &&
    permission !== 'accordee';

  if (canal === 'push') {
    return {
      cle: hebdo ? 'attenteSigneHebdo' : 'attenteSigneMensuel',
      detail: 'Par notification sur ce téléphone.',
      action: null,
    };
  }

  if (canal === 'email') {
    return {
      cle: hebdo ? 'attenteSigneHebdo' : 'attenteSigneMensuel',
      detail: coupees
        ? `Par email, à ${email} — les notifications sont coupées sur ce téléphone.`
        : `Par email, à ${email}.`,
      // Un canal marche déjà : la phrase constate, elle ne demande rien. Poser une porte ici
      // ferait passer un compte rattaché pour un état incomplet.
      action: null,
    };
  }

  const cle = hebdo ? 'attenteIciHebdo' : 'attenteIciMensuel';

  // La sixième ligne : le mot est demandé par email, mais aucune adresse ne peut le recevoir.
  // `coupees` est faux ici (il ne vaut que pour `push`), d'où la branche à part.
  if (etat.prefere === 'email') {
    return {
      cle,
      detail: 'Rattache un compte pour recevoir le mot par email.',
      action: PORTE_VERS_LE_COMPTE,
    };
  }

  // Permission accordée mais jeton absent : l'enregistrement a échoué, il repartira au
  // prochain lancement. Rien à dire plutôt qu'envoyer chercher un réglage que personne n'a
  // touché — le silence est le seul registre honnête d'un état qui se répare tout seul.
  return {
    cle,
    detail: coupees
      ? 'Les notifications sont coupées sur ce téléphone. Tu peux les rouvrir dans ses réglages, ou rattacher un compte pour l’email.'
      : null,
    // La porte suit la phrase, et pas l'état : sans phrase il n'y a rien à ouvrir, et c'est le
    // silence voulu juste au-dessus.
    action: coupees ? PORTE_VERS_LE_COMPTE : null,
  };
}
