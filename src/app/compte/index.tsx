import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ChoixDeRappel } from '@/components/compte/choix-de-rappel';
import { MonCompte } from '@/components/compte/mon-compte';
import { MessageInline } from '@/components/message-inline';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CONTACT_EMAIL } from '@/constants/editeur';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useChargementVisible } from '@/hooks/use-apres-un-delai';
import { useTrackView } from '@/hooks/use-track-view';
import { lireEtatDuRattachement, seDeconnecterDeCetAppareil } from '@/lib/compte';
import { revenirOu, terminerLeFlux } from '@/lib/navigation';
import {
  lireLaFenetreDuMotDeLaVeille,
  loadReminderPrefs,
  setMotDeLaVeille,
  setReminderChannel,
  type ReminderPrefs,
} from '@/lib/notification-prefs';
import { supabase } from '@/lib/supabase';
import { PHRASE_SANS_COMPTE_SUR_TOI, type EtatRattachement } from '@/types/compte';
import { messageDEcriture } from '@/types/ecriture-en-echec';
import { type CanalPrefere, type FenetreDeLaVeille } from '@/types/rappels';

// « Toi » — tout ce qui touche au compte, sorti de /suivi (v1-11 §2.5).
//
// Il vivait au bas du suivi, avec cette justification : « /suivi est la seule surface qui
// parle du compte dans la durée, un écran de plus serait un écran de plus à trouver ». Elle
// tombe avec la barre d'onglets : le compte a maintenant une porte visible depuis les deux
// lieux, et le suivi retrouve son sujet — les bilans et les points répondus.
//
// Cet écran vit **hors du groupe (tabs)** : il s'ouvre par-dessus, sans barre. C'est un
// détour, pas un troisième lieu.

/**
 * La place que le compte et les rappels prennent une fois lus, gardée pendant qu'ils se lisent
 * (décision du 01/10/2026, #305). L'écran rendait d'abord « Mes données » et « Supprimer mon
 * compte », puis insérait au-dessus le compte et « Les rappels » à leur arrivée : le lien descendait
 * de **412 px**, en deux temps, et un toucher pris dans ce saut se perdait sans erreur — ou tombait
 * sur ce qui avait pris sa place. **Attendre les lectures avant de rendre « Mes données » a été
 * écarté** : hors ligne, ou sur une lecture en échec, « Supprimer mon compte » ne s'afficherait pas,
 * et c'est le chemin que Google Play exige.
 *
 * **Mesurée, pas calculée, et sur web** : la hauteur naturelle du bloc une fois lu, pour un compte
 * anonyme — **412 px à 390 comme à 420 de large**. Elle valait 396 jusqu'au 01/10/2026 ; ce jour-là
 * le compte et les rappels sont devenus deux sections à 32 l'une de l'autre au lieu de 16 (audit
 * T-15), et la remesure sur l'export a rendu les 16 de l'écart en plus, rien d'autre. Ce n'est vrai
 * qu'à ces largeurs, pour ce compte et sur web — relevé le même jour : à 360 le texte passe sur une
 * ligne de plus (432, il reste 20 px de saut), à 320 sur deux (474, 62 px) ; plus large, il en
 * perd (390 à 600 de large, 368 à partir de 1 024) et le lien remonte d'autant ; un compte rattaché
 * ne dit pas la même phrase ; et **sur un téléphone
 * le réglage des rappels est plus haut** — trois lignes de canal au lieu de deux, la porte des
 * réglages, le mot de la veille —, donc le lien descend encore de la différence (`v1-13` §11.25). Un
 * saut peut donc rester, et c'est le risque accepté avec la décision. Le parcours réel mesure le reste
 * à chaque PR (« suppression du compte ») : une phrase allongée ici le fera tomber, et c'est le moment
 * de remesurer.
 */
const HAUTEUR_DU_COMPTE_EN_LECTURE = 412;

export default function Compte() {
  useTrackView('compte_view');

  const [etat, setEtat] = useState<EtatRattachement | null>(null);
  const [rappels, setRappels] = useState<ReminderPrefs | null>(null);
  // La fenêtre du mot de la veille (C4.2) : `null` tant qu'on ne l'a pas lue, ou sur un échec — le
  // réglage ne dit alors que la règle, et ne propose rien.
  const [fenetre, setFenetre] = useState<FenetreDeLaVeille | null>(null);
  const [messageCanal, setMessageCanal] = useState<string | null>(null);
  const [cle, setCle] = useState(0);
  // Un « Réessayer » : sa ligne de chargement se dit tout de suite (`useChargementVisible`).
  const [relance, setRelance] = useState(false);
  const [deconnexionEnCours, setDeconnexionEnCours] = useState(false);
  const [erreurDeconnexion, setErreurDeconnexion] = useState<string | null>(null);
  // **La confirmation de « Supprimer mon compte » est ouverte** — l'écran la tient, `MonCompte` la lit et
  // l'écrit. Il lui faut cet état pour une raison de dessin : voir `variantePrincipale`.
  const [confirmationOuverte, setConfirmationOuverte] = useState(false);
  // **Après la suppression, l'écran ne montre plus que sa confirmation** (recette du 28/09/2026,
  // constat H5). La carte « Mes données » se remplaçait seule par « C'est fait. », et tout le reste
  // de l'écran continuait de décrire le compte supprimé : son adresse, « Me déconnecter de cet
  // appareil », le rappel par email coché — trois gestes proposés sur un compte qui n'existe plus.
  // Le « Retour » part aussi : la sortie est « Revenir au début », qui repasse par la racine. Les
  // pages légales et l'adresse de contact, elles, restent en bas de l'écran.
  const [supprime, setSupprime] = useState(false);

  // **Les lectures arrivent ensemble, ou pas du tout** (#305, contre-lecture du 01/10/2026). Chacune
  // posait son état à son arrivée : l'écran grandissait en deux ou trois temps au-dessus de « Supprimer
  // mon compte », et la place gardée ne pouvait couvrir que la première lecture. Le compte, les rappels
  // et, sur natif, la fenêtre du mot de la veille sont donc posés ensemble ; les rappels ne le sont que
  // si le compte a pu être lu, puisque l'écran ne les montre pas sinon.
  //
  // **Et des rappels illisibles rendent l'écran « indisponible »** (01/10/2026, audit T-6, `FRONT.md`
  // §1.2). `loadReminderPrefs` posait « Par email » sur un profil illisible, et l'écran l'affichait
  // coché comme un réglage lu ; elle rend désormais `null`. L'état `indisponible` dit déjà les deux
  // échecs dans sa phrase — « ni relire tes réglages de rappel » — et porte « Réessayer » : rien de
  // neuf à écrire, et aucune ligne de canal ne s'affiche sur une lecture qui n'a pas eu lieu.
  //
  // `etat` n'est remis à `null` que par « Réessayer » : le rappel de `SIGNED_IN`, plus bas, revient à
  // chaque retour sur l'onglet (`_onVisibilityChanged` d'auth-js), et vider l'écran à chaque fois le
  // ferait clignoter. Une relecture garde donc l'écran tel qu'il était jusqu'à ce qu'elle revienne.
  useEffect(() => {
    let annule = false;
    void Promise.allSettled([
      lireEtatDuRattachement(),
      loadReminderPrefs(),
      // Sur web, le mot de la veille n'existe pas : rien à lire.
      Platform.OS === 'web' ? Promise.resolve(null) : lireLaFenetreDuMotDeLaVeille(),
    ]).then(([lu, prefs, fenetreLue]) => {
      if (annule) return;
      // **Jamais `local` sur un échec** (A6-8) : c'est l'état le plus affirmatif, celui qui dit
      // « tu n'as pas de compte » et propose d'en créer un. `lireEtatDuRattachement` rend
      // désormais `indisponible` sans lever, et ce repli couvre le cas où elle lève quand même.
      const rappelsLus = prefs.status === 'fulfilled' ? prefs.value : null;
      const compte: EtatRattachement =
        lu.status === 'fulfilled' && rappelsLus !== null ? lu.value : { kind: 'indisponible' };
      setEtat(compte);
      setRelance(false);
      if (compte.kind !== 'indisponible') setRappels(rappelsLus);
      if (fenetreLue.status === 'fulfilled') setFenetre(fenetreLue.value);
    });
    return () => {
      annule = true;
    };
  }, [cle]);

  // **`/compte` est une URL publique, et elle peut arriver avant la session.** Ouverte
  // directement sur web, la lecture ci-dessus part pendant qu'`ensureSession()` est encore en
  // vol : `getUser()` rend `AuthSessionMissingError`, l'écran affiche « On n'a pas pu vérifier
  // ton compte à l'instant » à quelqu'un dont la session arrive une demi-seconde plus tard, et
  // l'effet ne dépendant que de `cle`, rien ne le corrigeait avant un clic.
  //
  // On relit donc dès qu'une session s'ouvre. **`SIGNED_IN` et rien d'autre** : c'est
  // l'événement de la session anonyme qui vient d'être créée et celui du lien de connexion
  // ouvert depuis la messagerie, alors qu'`INITIAL_SESSION` partirait à chaque montage (une
  // lecture pour rien) et que `TOKEN_REFRESHED` revient toutes les heures sans rien changer à
  // l'écran. Le rappel reste synchrone, comme celui du layout racine. Le bouton « Réessayer »
  // reste le repli pour ce que cette écoute ne voit pas — le réseau coupé, d'abord.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evenement) => {
      if (evenement === 'SIGNED_IN') setCle((n) => n + 1);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Gestionnaire d'événement : l'écriture synchrone y est légitime, et remettre l'état à
  // « on ne sait pas » donne à la personne le seul retour visible de son geste — sans ça, un
  // second échec rend exactement le même écran et le bouton a l'air mort.
  const reessayer = () => {
    setEtat(null);
    setRelance(true);
    setCle((n) => n + 1);
  };

  // **Vers la racine, et pas en arrière** : la racine décide où aller selon qu'un bilan complété
  // existe, et après une déconnexion il n'en existe plus pour cette session — elle route donc vers
  // l'onboarding. Revenir en arrière aurait ramené sur le plan d'un compte qu'on vient de quitter,
  // avec des données encore en mémoire d'écran. **Et la pile se vide avant** (01/10/2026, audit
  // T-1) : un `replace('/')` seul ne remplaçait que « Toi », et le plan quitté restait dessous —
  // le premier retour depuis l'onboarding y ramenait (`terminerLeFlux`).
  const seDeconnecter = async () => {
    if (deconnexionEnCours) return;
    setDeconnexionEnCours(true);
    setErreurDeconnexion(null);

    const resultat = await seDeconnecterDeCetAppareil();

    if (!resultat.ok) {
      setDeconnexionEnCours(false);
      setErreurDeconnexion(resultat.message);
      return;
    }

    terminerLeFlux('/');
  };

  // Optimiste puis corrigé : le réglage doit répondre au doigt, et une écriture qui échoue
  // remet la ligne où elle était plutôt que de laisser croire à un choix enregistré.
  //
  // **Et elle le dit** (A12-6) : le retour en arrière silencieux laissait quelqu'un croire
  // qu'il avait coupé ses rappels alors qu'ils partent toujours — la préférence ne se dégrade
  // jamais d'elle-même côté serveur, donc rien d'autre ne viendra rattraper ce malentendu.
  const choisirLeCanal = async (canal: CanalPrefere) => {
    const avant = rappels;
    setMessageCanal(null);
    setRappels((p) => (p ? { ...p, prefere: canal } : p));
    const echec = await setReminderChannel(canal);
    if (!echec) return;
    setRappels(avant);
    setMessageCanal(messageDEcriture('Ton choix n’a pas été enregistré.', echec));
  };

  // Le mot de la veille, sur le même modèle : optimiste, remis en place et dit sur un échec. Il ne
  // passe jamais par `jamais_propose` — la base le refuse, et c'est ce qui garantit qu'un refus
  // n'est pas reproposé.
  const choisirLaVeille = async (reponse: 'oui' | 'refuse') => {
    const avant = rappels;
    setMessageCanal(null);
    setRappels((p) => (p ? { ...p, reponseALaVeille: reponse } : p));
    const echec = await setMotDeLaVeille(reponse);
    if (!echec) return;
    setRappels(avant);
    setMessageCanal(messageDEcriture('Ton choix n’a pas été enregistré.', echec));
  };

  // **La place est gardée tant que les lectures ne sont pas revenues** (#305) : elles arrivent
  // ensemble, donc `etat` suffit à le dire.
  const enLecture = etat === null;
  // **Un seul bouton principal par état d'écran, « Toi » en confirmation comprise** (01/10/2026, `v1-33`
  // §6, Von Restorff). Confirmation ouverte, « Supprimer définitivement » est le principal — la règle du
  // kit, qui ne connaît pas de variante destructive —, et « Rattacher un compte » portait le même vert
  // plein à quelques centimètres : deux principaux, mesurés. Tant qu'elle est ouverte, ce que cet écran
  // pose en principal passe en secondaire, et redevient principal à sa fermeture — « Annuler », le retour
  // matériel. Même chose pour « Réessayer », l'autre principal de cet écran, que le constat n'avait pas
  // relevé : il est porté par l'état `indisponible`, qui coexiste avec la confirmation de la même façon.
  // Aucun texte ne change, et la hauteur non plus : la variante secondaire n'a pas de filet ici.
  const variantePrincipale = confirmationOuverte ? 'secondary' : 'primary';
  // Muette les 300 premières millisecondes, comme les onglets — la place suffit à tenir l'écran, et une
  // phrase qui clignote une image ne dit rien —, sauf après « Réessayer » : hors ligne, l'échec revient
  // bien sous ce délai, et sans la ligne le bouton aurait l'air mort (`FRONT.md` §1.2).
  const chargementVisible = useChargementVisible(enLecture, relance);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.contenu} showsVerticalScrollIndicator={false}>
          <View style={styles.page}>
            {!supprime && (
              <TextLink
                label="Retour"
                apparence="discret"
                onPress={() => revenirOu('/')}
                role="link"
                containerStyle={styles.retour}
              />
            )}
            <ThemedText type="screenTitle">Toi</ThemedText>

            {!supprime && (
              <View style={[styles.compteEtRappels, enLecture && styles.enLecture]}>
                {chargementVisible && (
                  <ThemedText type="small" themeColor="textTertiary">
                    Chargement de ton compte…
                  </ThemedText>
                )}
                {/* **Trois sections, et un écart qui les sépare** (01/10/2026, audit T-15) : le compte, les
                    rappels, puis « Mes données ». Tout était espacé de 16, sections comprises — à l'œil,
                    « Rattacher un compte » et « Les rappels » étaient aussi proches que deux lignes de canal.
                    32 entre les sections, 16 dedans. */}
                {etat !== null && (
                  <View style={styles.section}>
                  {/* Trois états et pas deux (issue #62). Entre `updateUser({ email })` et la saisie du
                      code, la ligne porte déjà l'adresse alors que le compte n'est pas rattaché : cet
                      écran proposait alors de « rattacher un compte », comme si la demande n'avait jamais
                      eu lieu — et la boucle ouverte par l'écran des e-mails ne se refermait nulle part.
                      (C'était un clic de confirmation jusqu'au 20/09/2026 ; c'est un code depuis, et cet
                      état porte désormais la porte qui ramène à la saisie.) `etatDuRattachement` nomme cet
                      entre-deux, là où `etatDuCompte` a raison de le confondre avec l'anonymat.

                      Registre : un fait, jamais une relance. Pas de « pense à confirmer », pas de
                      bouton pour renvoyer l'email — la personne a déjà ce qu'il lui faut dans sa
                      messagerie, et rien ici ne doit se lire comme un reproche. */}
                  {etat?.kind === 'rattache' && (
                    <ThemedText type="body" themeColor="textSecondary">
                      {etat.email
                        ? `Ton compte est rattaché à ${etat.email}. Ton bilan te suit d’un appareil à l’autre.`
                        : 'Ton compte est rattaché. Ton bilan te suit d’un appareil à l’autre.'}
                    </ThemedText>
                  )}

                  {/* **Une sortie, et elle n'existait pas** (C2.11, arbitrage D17). Le seul `signOut` du
                      produit était celui de la suppression de compte : quelqu'un qui prête son téléphone
                      n'avait le choix qu'entre laisser sa session ouverte et supprimer son compte. La
                      phrase est là pour dire ce qui ne part pas — sans elle, « me déconnecter » se lit
                      comme une perte.

                      Proposé au seul compte **rattaché** : déconnecter une session anonyme la rendrait
                      inatteignable pour toujours, puisque rien ne permet d'y revenir. */}
                  {etat?.kind === 'rattache' && (
                    <>
                      <Button
                        title={deconnexionEnCours ? 'Déconnexion…' : 'Me déconnecter de cet appareil'}
                        variant="secondary"
                        disabled={deconnexionEnCours}
                        onPress={seDeconnecter}
                        style={styles.bouton}
                      />
                      <ThemedText type="small" themeColor="textTertiary">
                        Tes données restent sur ton compte.
                      </ThemedText>
                      <MessageInline message={erreurDeconnexion} />
                    </>
                  )}

                  {etat?.kind === 'a_confirmer' && (
                    <>
                      <ThemedText type="body" themeColor="textSecondary">
                        Adresse à confirmer : {etat.email}. Un code est parti par email ; une fois tapé,
                        ton bilan te suivra d’un appareil à l’autre.
                      </ThemedText>
                      {/* **Cette porte rend vraie une phrase écrite ailleurs.** L'écran de code dit « si tu
                          quittes cet écran, tu retrouves la saisie du code depuis “Toi” » — c'était faux
                          tant que cet écran ne portait qu'un constat, et le cas n'est pas rare : sur web,
                          aller chercher le code dans sa messagerie peut emporter l'onglet. L'écran de
                          rattachement relit l'adresse en local et s'ouvre directement sur la saisie, sans
                          renvoyer de code — celui qui est déjà dans la boîte vaut encore, et « Renvoyer un
                          code » est là pour l'autre cas.

                          Un fait et une porte, pas une relance : ni « pense à », ni bouton de renvoi ici. */}
                      <TextLink
                        label="Saisir le code"
                        apparence="action"
                        onPress={() => router.push({ pathname: '/connexion/email', params: { reprise: '1' } })}
                        role="link"
                      />
                    </>
                  )}

                  {etat?.kind === 'local' && (
                    <>
                      {/* **L'échéance, et pas seulement l'avantage** (arbitré le 21/09/2026,
                          `v1-28` §7.2). Cet écran disait ce qu'un compte apporte et jamais ce que son
                          absence coûte, donc le délai de la purge n'était lu que par ceux qui avaient
                          déjà ouvert `/connexion` — c'est-à-dire pas par la personne que la purge
                          efface. La clause et le délai sont partagés avec cet écran-là, à un seul
                          endroit. */}
                      <ThemedText type="body" themeColor="textSecondary">
                        {PHRASE_SANS_COMPTE_SUR_TOI}
                      </ThemedText>
                      <Button
                        title="Rattacher un compte"
                        variant={variantePrincipale}
                        onPress={() => router.push({ pathname: '/connexion', params: { source: 'compte' } })}
                        style={styles.bouton}
                      />
                    </>
                  )}

                  {/* **Le quatrième état, et le seul qui n'affirme rien** (A6-8). `getUser()` est un
                      aller-retour réseau : hors ligne, cet écran disait à une personne rattachée
                      depuis des mois qu'elle n'a pas de compte, et lui proposait d'en créer un. Pas
                      de bouton de rattachement ici — proposer un compte à quelqu'un qui en a
                      peut-être un est exactement le mensonge qu'on corrige. */}
                  {etat?.kind === 'indisponible' && (
                    <>
                      <ThemedText type="body" themeColor="textSecondary">
                        On n’a pas pu vérifier ton compte à l’instant, ni relire tes réglages de
                        rappel. Rien n’a changé de ton côté.
                      </ThemedText>
                      <Button title="Réessayer" variant={variantePrincipale} onPress={reessayer} style={styles.bouton} />
                    </>
                  )}
                  </View>
                )}

                {/* Le réglage s'affiche pour tout le monde, y compris une session anonyme : le
                    push n'a besoin que d'un jeton d'appareil (v1-12 §2.5). C'était l'inverse
                    avant, l'interrupteur email n'apparaissant qu'avec un compte rattaché.

                    **Sauf quand une lecture a échoué** — le compte, ou les rappels eux-mêmes, que
                    `loadReminderPrefs` rend `null` depuis le 01/10/2026 au lieu d'un canal par
                    défaut : l'écran est alors `indisponible`, et sa phrase dit les deux. On attend
                    donc de savoir : les lectures partent ensemble, et `etat` vaut toujours quelque
                    chose à l'arrivée, échec compris. */}
                {rappels && etat !== null && etat.kind !== 'indisponible' && (
                  <View style={styles.section}>
                    <ChoixDeRappel
                      prefs={rappels}
                      fenetre={fenetre}
                      onChoisir={choisirLeCanal}
                      onChoisirLaVeille={choisirLaVeille}
                    />
                    <MessageInline message={messageCanal} />
                  </View>
                )}
              </View>
            )}

            <MonCompte
              confirmation={confirmationOuverte}
              onConfirmation={setConfirmationOuverte}
              onSupprime={() => setSupprime(true)}
            />

            <View style={styles.liens}>
              {/* Après la suppression, les deux liens qui supposent un compte partent avec lui ;
                  les pages légales et l'adresse de contact restent — la confidentialité dit
                  justement ce qui vient d'être effacé (recette du 28/09/2026, constat H5). */}
              {!supprime && (
                <>
                  {/* **La seconde porte du contexte, et elle n'est pas un confort** (C6.4). La
                      première est l'encart du plan, qui ne se rend que s'il y a au moins une action à
                      expliquer : tout cycliste et tout profil sédentaire a un plan à zéro action depuis
                      C2.5, donc sans celle-ci l'écran serait **inatteignable** pour exactement les
                      personnes dont le contexte explique le plus le plan. L'écran gère lui-même le cas
                      d'un compte sans bilan, qui est le seul où ce lien ne mène à rien à corriger. */}
                  <TextLink
                    label="Mon contexte de mobilité"
                    apparence="action"
                    onPress={() => router.push('/contexte')}
                    role="link"
                  />
                  <TextLink
                    label="Un retour à nous faire ?"
                    apparence="action"
                    onPress={() => router.push('/feedback')}
                    role="link"
                  />
                </>
              )}
              <TextLink
                label="Confidentialité"
                apparence="discret"
                onPress={() => router.push('/confidentialite')}
                role="link"
              />
              <TextLink
                label="Conditions d’utilisation"
                apparence="discret"
                onPress={() => router.push('/conditions')}
                role="link"
              />
              {/* Une phrase adressée à la personne, donc en Spline Sans : la chasse fixe est
                  réservée aux sources et aux codes techniques (24/09/2026, `v1-29`). */}
              <ThemedText type="small" themeColor="textTertiary" style={styles.contact}>
                Une question ? Écris à {CONTACT_EMAIL}.
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  contenu: { padding: Spacing.four, paddingBottom: Spacing.six },
  page: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  retour: { alignSelf: 'flex-start' },
  bouton: { marginTop: Spacing.one },
  // **32 entre les sections, 16 dedans** (01/10/2026, audit T-15) : le compte et les rappels sont
  // deux sections, et « Mes données » la troisième — d'où la marge du bas, qui s'ajoute à l'écart de
  // la page (`EXPO.md` §1.6 : en Yoga, les marges ne fusionnent pas) et qui part avec le bloc après
  // une suppression, où « C'est fait. » suit le titre.
  compteEtRappels: { gap: Spacing.five, marginBottom: Spacing.three },
  section: { gap: Spacing.three },
  enLecture: { minHeight: HAUTEUR_DU_COMPTE_EN_LECTURE },
  liens: { gap: Spacing.one, marginTop: Spacing.two },
  contact: { marginTop: Spacing.two },
});
