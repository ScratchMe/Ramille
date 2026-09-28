import { router } from 'expo-router';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { FeuilleDuBas } from '@/components/feuille-du-bas';
import { LigneDeCanal } from '@/components/ligne-de-canal';
import { MessageInline } from '@/components/message-inline';
import { RamilleDit } from '@/components/ramille-dit';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { TitreDArrivee } from '@/components/titre-d-arrivee';
import { RAMILLE } from '@/constants/mascotte';
import { Spacing } from '@/constants/theme';
import { demanderLaPermission, enregistrerLeJeton } from '@/lib/rappels';
import {
  lireLaFenetreDuMotDeLaVeille,
  marquerFeuilleDeRappelVue,
  marquerLaVeilleProposee,
  setMotDeLaVeille,
  setReminderChannel,
  type ReminderPrefs,
} from '@/lib/notification-prefs';
import {
  affichageDeLaVeille,
  canalPreselectionne,
  libelleBouton,
  lignesDeReglage,
  REPONSES_DE_LA_PROPOSITION,
  type Boucle,
  type CanalPrefere,
  type FenetreDeLaVeille,
  type OuvertureDeLaFeuille,
  type Permission,
  type ReponseALaVeille,
} from '@/types/rappels';

/** Ce que la première étape a enregistré, pour que la seconde referme la feuille sur le bon état. */
type Retenu = { canal: CanalPrefere; jetonActif: boolean };

const MESSAGE_D_ECHEC = 'Ton choix n’a pas été enregistré. Vérifie ta connexion et réessaie.';

/**
 * La feuille — le moment où Ramille explique comment le suivi va se passer, et demande la
 * permission de prévenir. Juste après « C'est noté », une fois par appareil.
 * Canvas : `docs/design/v1-12-rappels/Main.dc.html` (direction B), v1-12 §6.1.
 *
 * **Pourquoi une feuille à elle et pas un encart sous la carte d'action.** Les cartes du plan
 * portent des kilos, le cap aussi ; la règle « jamais la mascotte à côté d'un chiffre lourd »
 * y interdisait le visage. Ici il n'y a aucun chiffre, donc Ramille peut parler en personne —
 * et il y a la place de dire ce qui va se passer **avant** de demander quoi que ce soit.
 *
 * **La demande est en deux temps, et ce n'est pas un luxe.** Sur Android 13 et plus, le
 * dialogue système ne s'affiche plus jamais après deux refus. Un « non » ici ne coûte rien ;
 * un « non » au système ferme le canal pour de bon. D'où le libellé du bouton, qui n'annonce
 * un dialogue que s'il va vraiment s'en ouvrir un.
 *
 * **Elle a un nom, « Les rappels », et pas d'en-tête visible** — le nom du réglage de « Toi », où la
 * dernière ligne renvoie. Sur web, la fenêtre s'annonçait en dialogue **sans nom** (audit
 * d'accessibilité, 1.3.1) ; le cadre partagé (`FeuilleDuBas`) nomme le dialogue par son titre, et
 * celui-ci ne pouvait pas être la ligne de Ramille, qui change avec la boucle. Le 24/09/2026, ce
 * titre s'était aussi **affiché** en tête de la feuille : son canvas n'en dessine pas, et aucune
 * décision ne l'avait demandé. Il ne sert plus qu'à nommer (`enTete={false}`, 25/09/2026), et cette
 * absence est **décidée** depuis le même jour (`v1-29` §6.3) : ne pas le remettre par symétrie avec
 * la feuille du nouveau bilan, qui affiche le sien.
 *
 * **Et une seconde étape depuis C4.2 : le mot de la veille** (`v1-25`). Une fois la notification
 * choisie **et reçue** sur ce téléphone, et seulement si l'action qu'on vient d'engager porte sur le
 * trajet et que sa fenêtre de dix semaines est ouverte, Ramille demande si elle fait signe aussi la
 * veille. La condition vit en deux endroits, et l'écran ne fait que les lire : le **poste de l'action
 * engagée**, que la feuille reçoit par `boucle` (hebdomadaire ⟺ trajet, `boucleDeLAction`) — sans
 * lui, rien ne se demande ; et `affichageDeLaVeille` (module pur, testé), qui dit si la proposition
 * tiendrait. La seconde ne connaît pas l'action qu'on vient d'engager : elle lit la fenêtre du
 * serveur, qui ne s'ouvre que sur une action de trajet, et c'est ce qui suffisait — la première
 * condition rend la chose explicite, comme dans la réouverture (`laVeilleSeRepropose`). Les deux boutons enregistrent chacun une réponse — « Non merci » est un refus, qui ne
 * sera jamais reproposé (D2) —, et refermer la feuille sans répondre ne répond rien : la question
 * reste alors posée dans « Toi ». La fenêtre est demandée dès l'ouverture, pour que la seconde étape
 * n'attende pas le réseau après « Autoriser », et attendue au moment d'y passer ; si sa lecture
 * échoue, il n'y a pas de seconde étape — on ne propose pas un mot dont on ne sait pas s'il
 * partirait.
 *
 * **Et elle peut s'ouvrir directement sur cette seconde étape**, une fois (arbitrage du 27/09/2026) :
 * au premier engagement sur une action de trajet **où la question peut être posée**, quand la
 * feuille entière a déjà été vue sans elle — parce que le premier choix était un vol, qui n'appelle
 * pas la question, ou parce que le téléphone ne recevait pas encore les notifications. Ce qui s'ouvre se
 * décide avant, dans `ouvertureDeLaFeuille` ; la feuille ne fait que partir de l'étape qu'on lui
 * donne. La question posée, par l'un ou l'autre chemin, est marquée sur l'appareil dès qu'elle
 * s'affiche (`marquerLaVeilleProposee`) : elle ne revient pas.
 */
export function FeuilleRappels({
  prefs,
  boucle,
  permission,
  ouverture,
  onFerme,
}: {
  prefs: ReminderPrefs;
  boucle: Boucle;
  permission: Permission;
  /** L'étape où la feuille s'ouvre : le choix du canal, ou la seule question de la veille. */
  ouverture: OuvertureDeLaFeuille;
  /**
   * Le canal retenu et la réponse au mot de la veille, pour que le plan rafraîchisse sa carte
   * d'attente sans relire la base.
   */
  onFerme: (canal: CanalPrefere, jetonActif: boolean, reponseALaVeille: ReponseALaVeille | null) => void;
}) {
  const plateforme = Platform.OS === 'web' ? 'web' : 'natif';

  // Présélection dérivée, jamais une ligne grisée : la préférence si elle est choisissable,
  // la notification sinon sur natif (`canalPreselectionne`, module pur et testé). Calculée une
  // fois à l'ouverture — la feuille ne reste pas assez longtemps pour que l'état bouge sous
  // elle, et la recalculer écraserait le choix qui vient d'être fait.
  const [canal, setCanal] = useState<CanalPrefere>(() =>
    canalPreselectionne({ ...prefs, plateforme, permission })
  );
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // La seconde étape : `null` tant qu'on est sur le choix du canal, puis ce qui a été enregistré et
  // la ligne à dire sous la question de Ramille. Ouverte directement sur elle, la feuille n'a rien
  // enregistré : le canal et le jeton sont ceux qu'elle a reçus.
  const [veille, setVeille] = useState<(Retenu & { detail: string }) | null>(() =>
    ouverture.etape === 'veille'
      ? { canal: prefs.prefere, jetonActif: prefs.jetonActif, detail: ouverture.detail }
      : null
  );

  // « Une fois, jamais plus » : la marque se pose quand la question s'affiche, quel que soit le
  // chemin qui l'a amenée — pas quand on y répond, sans quoi refermer la feuille la ferait revenir au
  // prochain engagement de trajet.
  const questionAffichee = veille !== null;
  useEffect(() => {
    if (questionAffichee) void marquerLaVeilleProposee();
  }, [questionAffichee]);

  // La fenêtre du mot de la veille, demandée dès l'ouverture et seulement si la question peut encore
  // se poser : une réponse déjà donnée ne se repose pas, et sur web le mot n'existe pas. **Une
  // promesse gardée dans une `ref`, et non un état** : `valider` l'attend après le dialogue système,
  // et un état lu depuis sa fermeture serait celui du rendu où l'on a appuyé — `null` si la lecture
  // n'était pas encore revenue, donc pas de seconde étape pour qui appuie vite.
  const aProposer =
    ouverture.etape === 'canal' &&
    boucle === 'hebdo' &&
    plateforme === 'natif' &&
    prefs.reponseALaVeille === 'jamais_propose';
  const fenetreEnVol = useRef<Promise<FenetreDeLaVeille | null> | null>(null);
  useEffect(() => {
    if (!aProposer || fenetreEnVol.current) return;
    fenetreEnVol.current = lireLaFenetreDuMotDeLaVeille().catch(() => null);
  }, [aProposer]);

  const lignes = lignesDeReglage({ ...prefs, prefere: canal, plateforme, permission });

  const valider = async () => {
    setOccupe(true);
    setErreur(null);

    const ok = await setReminderChannel(canal);
    if (!ok) {
      setOccupe(false);
      setErreur(MESSAGE_D_ECHEC);
      return;
    }

    // Le dialogue système, seulement si la personne a dit oui chez nous.
    //
    // `jetonActif` ne prend que ce que l'enregistrement a **vraiment** obtenu : une permission
    // accordée dont le jeton n'a pas pu s'inscrire (pas de réseau, pas d'identifiants FCM,
    // simulateur) laissait la carte d'attente promettre une notification qui ne partirait
    // jamais. Avec le booléen, elle bascule d'elle-même sur la bonne ligne du §3.
    let jetonActif = prefs.jetonActif;
    if (canal === 'push' && permission !== 'fermee') {
      const apres = await demanderLaPermission();
      jetonActif = apres === 'accordee' ? await enregistrerLeJeton() : false;
    }

    await marquerFeuilleDeRappelVue();
    const fenetre = fenetreEnVol.current ? await fenetreEnVol.current : null;
    setOccupe(false);

    // La seconde étape, si et seulement si la dérivation la propose — avec le canal **enregistré**
    // et le jeton **obtenu**, pas ceux d'avant la feuille.
    const affichage = affichageDeLaVeille({
      plateforme,
      prefere: canal,
      jetonActif,
      emailPossible: prefs.emailPossible,
      reponse: prefs.reponseALaVeille,
      fenetre,
    });
    if (affichage.kind === 'proposition') {
      setVeille({ canal, jetonActif, detail: affichage.detail });
      return;
    }

    onFerme(canal, jetonActif, prefs.reponseALaVeille);
  };

  const repondreALaVeille = async (retenu: Retenu, reponse: 'oui' | 'refuse') => {
    setOccupe(true);
    setErreur(null);
    const ok = await setMotDeLaVeille(reponse);
    setOccupe(false);
    if (!ok) {
      setErreur(MESSAGE_D_ECHEC);
      return;
    }
    onFerme(retenu.canal, retenu.jetonActif, reponse);
  };

  if (veille !== null) {
    return (
      <FeuilleDuBas
        titre="Les rappels"
        enTete={false}
        // Refermer sans répondre ne répond rien : le canal est déjà enregistré, la question reste
        // posée dans « Toi ». La feuille, elle, est déjà marquée vue.
        onFerme={() => onFerme(veille.canal, veille.jetonActif, prefs.reponseALaVeille)}
      >
        {/* Le contenu change sous le doigt : le focus va à la question qui arrive (`FRONT.md` §2.4),
            sans quoi le lecteur d'écran resterait sur un bouton qui n'existe plus. */}
        <TitreDArrivee>
          <RamilleDit ligne={RAMILLE.proposerLaVeille} mood="calm" size={44} themeColor="text" style={styles.mot} />
        </TitreDArrivee>

        {/* Du produit et non d'elle : la ligne porte une date. */}
        <ThemedText type="body" themeColor="textSecondary">
          {veille.detail}
        </ThemedText>

        <MessageInline message={erreur} />

        <Button
          title={REPONSES_DE_LA_PROPOSITION.oui}
          onPress={() => void repondreALaVeille(veille, 'oui')}
          disabled={occupe}
        />
        <Button
          title={REPONSES_DE_LA_PROPOSITION.non}
          variant="secondary"
          onPress={() => void repondreALaVeille(veille, 'refuse')}
          disabled={occupe}
        />

        <ThemedText type="small" themeColor="textTertiary" style={styles.sortie}>
          Tu pourras changer d’avis dans « Toi ».
        </ThemedText>
      </FeuilleDuBas>
    );
  }

  return (
    <FeuilleDuBas
      titre="Les rappels"
      enTete={false}
      // Le geste de retour ferme la feuille sans rien choisir : refuser de la fermer serait
      // transformer une proposition en passage obligé.
      onFerme={() => {
        void marquerFeuilleDeRappelVue();
        onFerme(prefs.prefere, prefs.jetonActif, prefs.reponseALaVeille);
      }}
    >
      <RamilleDit
        ligne={boucle === 'hebdo' ? RAMILLE.engagementAttenteHebdo : RAMILLE.engagementAttenteMensuel}
        mood="calm"
        size={44}
        themeColor="text"
        style={styles.mot}
      />

      <ThemedText type="body" themeColor="textSecondary">
        {RAMILLE.choixCanal}
      </ThemedText>

      {/* Le rôle `radiogroup` ne porte que sur ce bloc, **nommé par la question de Ramille** qui le
          précède (24/09/2026) : il s'annonçait sans nom. Le lien des réglages y entre, parce
          qu'il appartient à la ligne « notification » : rendu après le groupe, il tombait
          sous « Sans rappel » et se lisait comme appartenant à ce choix-là (canvas
          `Main.dc.html` / `Toi.dc.html` : il suit la rangée atténuée). Il n'est pas un
          `radio` et rien ne le compte comme une option. */}
      <GroupeDeChoix question={RAMILLE.choixCanal} style={styles.lignes}>
        {lignes.map((ligne) => (
          <Fragment key={ligne.canal}>
            <LigneDeCanal ligne={ligne} onChoisir={setCanal} occupe={occupe} />

            {/* Le seul état où la phrase appelle un geste hors de l'app : les notifications
                sont fermées pour de bon côté système, et rien ici ne peut les rouvrir. */}
            {ligne.lienVersLesReglages && (
              <TextLink
                label="Ouvrir les réglages du téléphone"
                onPress={() => void Linking.openSettings()}
                role="link"
                type="small"
                weight={600}
                themeColor="accentText"
                containerStyle={styles.reglages}
              />
            )}

            {/* **La porte qui manquait, et c'est le seul ajout de produit du 20/09/2026.**
                Cette feuille demande « comment te faire signe ? » et grisait « Par email »
                avec « Rattache un compte pour l'activer » — sans rien à toucher. C'était le
                seul écran du produit qui pose la question à laquelle le compte répond, et le
                seul où on ne le proposait pas. Même forme, même place et même raison que le
                lien des réglages juste au-dessus : rendu **dans** la boucle, parce que
                détaché il se lirait comme appartenant à « Sans rappel ».

                Le `Modal` doit être refermé avant de naviguer — sur natif, une route poussée
                sous un `Modal` ouvert reste dessous. On ne change donc pas la préférence : on
                rend celle qui est déjà là, et la personne revient à une feuille qu'elle a
                déjà vue. Ce qu'elle trouve au retour est juste sans rien réécrire, la
                préférence en base valant `email` par défaut. */}
            {ligne.porteVersLeCompte && (
              <TextLink
                label="Rattacher un compte"
                onPress={() => {
                  void marquerFeuilleDeRappelVue();
                  onFerme(prefs.prefere, prefs.jetonActif, prefs.reponseALaVeille);
                  router.push({ pathname: '/connexion', params: { source: 'rappels' } });
                }}
                role="link"
                type="small"
                weight={600}
                themeColor="accentText"
                containerStyle={styles.reglages}
              />
            )}
          </Fragment>
        ))}
      </GroupeDeChoix>

      <MessageInline message={erreur} />

      <Button title={libelleBouton(canal, permission)} onPress={valider} disabled={occupe} />

      <ThemedText type="small" themeColor="textTertiary" style={styles.sortie}>
        Tu pourras changer d’avis dans « Toi ».
      </ThemedText>
    </FeuilleDuBas>
  );
}

const styles = StyleSheet.create({
  mot: { alignItems: 'flex-start' },
  lignes: { gap: Spacing.two },
  reglages: { alignSelf: 'flex-start', paddingHorizontal: Spacing.four },
  sortie: { textAlign: 'center' },
});
