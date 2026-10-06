import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuDessusDuClavier } from '@/components/au-dessus-du-clavier';
import { TextField } from '@/components/auth/text-field';
import { Button } from '@/components/button';
import { RamilleDit } from '@/components/ramille-dit';
import { TextLink } from '@/components/text-link';
import { MessageInline } from '@/components/message-inline';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CONTACT_EMAIL } from '@/constants/editeur';
import { RAMILLE } from '@/constants/mascotte';
import { APP_NAME } from '@/constants/produit';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { SaisieDuCode } from '@/components/auth/saisie-du-code';
import { track } from '@/lib/analytics';
import { demanderLaConnexion } from '@/lib/auth';
import { deleteMyAccount, lireEtatDuCompte } from '@/lib/compte';
import { donnerLeFocus, FOCALISABLE_PAR_PROGRAMME, type TitreFocalisable } from '@/lib/focus';
import { type EtatSuppression } from '@/types/compte-suppression';
import {
  adresseSemblePlausible,
  estLimiteDEnvoi,
  messageDeLaDemande,
  suiteDeLaDemandeDeCode,
} from '@/types/connexion';

// Page publique de suppression de compte — **exigée par Google Play** en plus du chemin
// dans l'app : la fiche réclame une URL atteignable depuis un navigateur, par quelqu'un qui
// a déjà désinstallé l'application. C'est ce dernier point qui commande toute la mécanique
// ci-dessous.
//
// Le problème, propre au modèle d'auth de Ramille : cette personne arrive dans un navigateur
// où `ensureSession` vient de créer une session anonyme **vide**, qui n'est pas son compte.
// Aucune des fonctions d'auth existantes ne pouvait l'aider — elles rattachent toutes une
// identité à la session courante. D'où `demanderLaConnexion`, premier chemin du produit
// vers un compte *déjà existant*, et `shouldCreateUser: false` pour qu'une page de
// suppression ne puisse jamais fabriquer un compte.
//
// Trois états, dérivés dans `src/types/compte-suppression.ts` et testés là-bas :
//   - `rattache` : on sait à qui appartient le compte, on le nomme et on le supprime ;
//   - `anonyme-avec-donnees` : pas de compte, mais un bilan bien réel attaché à ce
//     navigateur — c'est la personne, et ses données méritent le même bouton ;
//   - `inconnu` : rien d'identifiable, on envoie un code à l'adresse du compte (un lien jusqu'au
//     20/09/2026).
//
// La confirmation est un état de composant et jamais un `Alert` : sur web, `Alert.alert`
// retombe sur `window.alert()`, qui n'invoque pas fiablement `onPress` — la suppression ne
// partirait jamais (cf. CLAUDE.md).
type Phase =
  | { kind: 'chargement' }
  | { kind: 'pret'; etat: EtatSuppression; confirme: boolean }
  | { kind: 'code' }
  | { kind: 'supprime' };

export default function SuppressionCompte() {
  const [phase, setPhase] = useState<Phase>({ kind: 'chargement' });
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /**
   * **Le focus suit le geste qui change la phase** (01/10/2026, audit T-4, `FRONT.md` §2.4). Le titre
   * de la page ne change pas, mais le bouton touché disparaît chaque fois avec la phase qui le
   * portait, et le focus retombait sur le document : rien n'annonçait ce qui venait d'arriver. Il va
   * donc à la première phrase de ce qui arrive — le bloc du compte après le code, la dernière étape,
   * « C'est fait. » —, ou au bouton « Supprimer mon compte » quand « Annuler » le fait revenir. La
   * saisie du code prend le sien elle-même (`SaisieDuCode`, `apresUnGeste`).
   *
   * `geste` retient la cible, posée par le gestionnaire ; l'effet la lit et l'efface, pour qu'un rendu
   * sans geste — la première lecture de l'état du compte — ne déplace rien. Le motif de
   * `ActionCommitment`. Une référence par cible, et non une partagée : la phrase du compte et la
   * dernière étape sont à l'écran ensemble.
   */
  const geste = useRef<'compte' | 'derniere-etape' | 'fait' | 'bouton' | null>(null);
  const phraseDuCompte = useRef<unknown>(null);
  const derniereEtape = useRef<unknown>(null);
  const fait = useRef<unknown>(null);
  const boutonSupprimer = useRef<View>(null);
  useEffect(() => {
    const vient = geste.current;
    geste.current = null;
    if (vient === 'compte') donnerLeFocus(phraseDuCompte.current);
    if (vient === 'derniere-etape') donnerLeFocus(derniereEtape.current);
    if (vient === 'fait') donnerLeFocus(fait.current);
    if (vient === 'bouton') donnerLeFocus(boutonSupprimer.current);
  }, [phase]);

  useEffect(() => {
    let annule = false;
    lireEtatDuCompte()
      .then((etat) => {
        if (!annule) setPhase({ kind: 'pret', etat, confirme: false });
      })
      .catch(() => {
        if (!annule) setPhase({ kind: 'pret', etat: { kind: 'inconnu' }, confirme: false });
      });
    return () => {
      annule = true;
    };
  }, []);

  const demanderLeCode = async () => {
    // Entrée part du champ, que le bouton désactivé ne garde pas : un second appui pendant l'envoi
    // ferait partir une seconde demande (01/10/2026, audit T-3).
    if (busy) return;
    setMessage(null);
    if (!adresseSemblePlausible(email)) {
      setMessage('Cette adresse semble incomplète.');
      return;
    }
    setBusy(true);
    // **Le code est ce qui rend cette page simple.** Elle s'ouvre par définition dans un
    // navigateur neuf — Google Play exige qu'elle soit atteignable sans l'application —, et un
    // lien en PKCE n'y valait que s'il revenait dans ce même navigateur : le cas le plus dur du
    // produit était celui dont Play dépend. Un code se tape là où l'écran l'attend.
    const { error } = await demanderLaConnexion(email);
    setBusy(false);

    // **La demande n'a pas abouti** (A6-12) : annoncer un code envoyé enverrait attendre un
    // message qui ne partira jamais, sur la page que Google Play exige et que quelqu'un ouvre
    // justement parce qu'il n'a plus l'application. Le tri est la liste blanche partagée
    // (`suiteDeLaDemandeDeCode`) : limite d'envoi et panne de transport se disent, **tout le
    // reste mène à l'écran de code**, y compris le 422 d'une adresse inconnue — sinon cette page
    // dirait qui a un compte Ramille.
    if (suiteDeLaDemandeDeCode('connexion', error) === 'message') {
      if (estLimiteDEnvoi(error)) track('connexion_limite', { ecran: 'suppression' });
      setMessage(messageDeLaDemande(error));
      return;
    }

    setPhase({ kind: 'code' });
  };

  const supprimer = async () => {
    setBusy(true);
    setMessage(null);
    const result = await deleteMyAccount();
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    geste.current = 'fait';
    setPhase({ kind: 'supprime' });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AuDessusDuClavier>
          {/* `handled` (01/10/2026, audit T-3) : clavier ouvert, le premier toucher sur « Recevoir un
              code » ne servait qu'à le fermer, le défaut de React Native. */}
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.page}>
              <ThemedText type="small" themeColor="textTertiary">
                {APP_NAME}
              </ThemedText>
              <ThemedText type="display">Supprimer mon compte</ThemedText>

              {phase.kind === 'chargement' && (
                <ThemedText themeColor="textSecondary" style={styles.corps}>
                  Un instant, on regarde à quel compte ce navigateur est rattaché.
                </ThemedText>
              )}

              {phase.kind === 'pret' && phase.etat.kind === 'inconnu' && (
                <>
                  <ThemedText
                    themeColor="textSecondary"
                    style={styles.corps}
                    {...({ ref: phraseDuCompte, ...FOCALISABLE_PAR_PROGRAMME } as TitreFocalisable)}
                  >
                    Ce navigateur n’est rattaché à aucun compte. Indique l’adresse de ton compte,
                    puis le code reçu par email : la session s’ouvre ici, et la suppression se fait
                    en un geste.
                  </ThemedText>
                  <View style={styles.bloc}>
                    <TextField
                      label="Adresse email du compte"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      placeholder="toi@exemple.fr"
                      onSubmitEditing={() => void demanderLeCode()}
                    />
                    <Button
                      title={busy ? 'Envoi…' : 'Recevoir un code'}
                      onPress={demanderLeCode}
                      disabled={busy}
                    />
                  </View>
                  {/* Ce renvoi nomme un écran, donc il vieillit : « Mes données » a quitté
                      /suivi pour « Toi » en v1-11 §2.5, et personne ne l'avait vu ici. Le geste
                      est décrit avant le nom de l'écran — quelqu'un qui cherche une section dans
                      un produit qu'il vient de réinstaller a besoin de savoir où toucher.
                      L'icône est nommée **comme le produit l'annonce** (« Ton compte », cf.
                      l'`accessibilityLabel` de `src/components/compte-bouton.tsx`) : cette page
                      se lit quasi exclusivement dans un navigateur — la revendication App Links
                      d'`app.json` ne couvre que `/plan` —, donc on cherche un mot qui existe
                      bien dans l'app, y compris pour TalkBack. « Icône de compte » n'y est nulle
                      part. */}
                  <ThemedText type="small" themeColor="textTertiary" style={styles.corps}>
                    Si tu as encore l’application, c’est plus direct : ouvre « Ton compte »,
                    l’icône en haut à droite de l’écran, puis la section « Mes données » de l’écran
                    « Toi ».
                  </ThemedText>
                </>
              )}

              {phase.kind === 'pret' && phase.etat.kind === 'anonyme-avec-donnees' && (
                <>
                  <ThemedText
                    themeColor="textSecondary"
                    style={styles.corps}
                    {...({ ref: phraseDuCompte, ...FOCALISABLE_PAR_PROGRAMME } as TitreFocalisable)}
                  >
                    Ce navigateur porte un bilan qui n’a jamais été rattaché à un compte. Il
                    n’existe donc nulle part ailleurs — et tu peux l’effacer ici.
                  </ThemedText>
                  {renduSuppression(phase.confirme)}
                </>
              )}

              {phase.kind === 'pret' && phase.etat.kind === 'rattache' && (
                <>
                  {/* « Tu es connecté » accordait au masculin la personne à qui la phrase
                      parle (A12-4), sur la page publique que Google Play exige. C'est le
                      navigateur qui porte la session : le dire ainsi est à la fois sans accord
                      de genre et plus exact — cette page n'affirme rien d'autre. */}
                  <ThemedText
                    themeColor="textSecondary"
                    style={styles.corps}
                    {...({ ref: phraseDuCompte, ...FOCALISABLE_PAR_PROGRAMME } as TitreFocalisable)}
                  >
                    {phase.etat.email
                      ? `Ce navigateur est connecté au compte ${phase.etat.email}.`
                      : 'Ce navigateur est connecté à ton compte.'}
                  </ThemedText>
                  {renduSuppression(phase.confirme)}
                </>
              )}

              {phase.kind === 'code' && (
                <SaisieDuCode
                  contexte="connexion"
              // Cet écran ne peut PAS affirmer qu'un code est parti — `shouldCreateUser: false`
              // fait qu'une adresse inconnue ne reçoit rien, et le dire divulguerait qui a un
              // compte. La voix porte ce « si », là où `/connexion/email` peut l'affirmer dans ses
              // deux branches (`src/types/connexion.ts`, `VoixDeLaSaisie`).
              voix="peut_etre"
                  // Toujours après « Recevoir un code » : cette page ne s'ouvre jamais sur le code.
                  apresUnGeste
                  adresse={email.trim()}
                  libelleBouton="Ouvrir ma session"
                  onOuverte={async () => {
                    // La session est celle du compte : on relit l'état et la page passe d'elle-même
                    // au bloc de suppression, comme elle le faisait quand le lien revenait ici.
                    //
                    // **Le repli ne renvoie plus au formulaire d'adresse**, et c'est un correctif : il
                    // rendait `inconnu`, donc « Ce navigateur n'est rattaché à aucun compte » — sur une
                    // page où le code vient d'être accepté et **consommé**. La seule sortie était d'en
                    // demander un autre, que `smtp_max_frequency` refuse pendant une minute, sur la
                    // page que Google Play exige de garder utilisable sans l'app. Ce que la
                    // vérification vient de prouver ne se perd pas parce qu'une seconde lecture a
                    // échoué : le code était celui de cette adresse, donc la session est ce compte.
                    const etat = await lireEtatDuCompte().catch(
                      () => ({ kind: 'rattache', email: email.trim() }) as const
                    );
                    geste.current = 'compte';
                    setPhase({ kind: 'pret', etat, confirme: false });
                  }}
                  onAutreAdresse={() => {
                    setMessage(null);
                    geste.current = 'compte';
                    setPhase({ kind: 'pret', etat: { kind: 'inconnu' }, confirme: false });
                  }}
                  renvoyer={demanderLaConnexion}
                />
              )}

              {phase.kind === 'supprime' && (
                <>
                  <ThemedText
                    themeColor="textSecondary"
                    style={styles.corps}
                    {...({ ref: fait, ...FOCALISABLE_PAR_PROGRAMME } as TitreFocalisable)}
                  >
                    C’est fait. Ton compte et tout ce qui s’y rattachait — bilans, plan, points de
                    suivi, retours — ont été supprimés définitivement.
                  </ThemedText>
                  <RamilleDit ligne={RAMILLE.auRevoir} mood="calm" size={44} tilt={-7} />
                </>
              )}

              <MessageInline message={message} style={styles.corps} />

              {/* **Ce qui reste après la suppression se dit ici, dans tous les états de la page** —
                  Google Play demande que l'adresse de suppression donnée dans la fiche dise ce qui
                  est supprimé, ce qui est gardé et combien de temps (`docs/exploitation/
                  fiche-google-play.md` §1.4, décidé le 02/10/2026). Hors des blocs d'état, pour que
                  le rendu statique le porte : c'est lui que lit quelqu'un qui ouvre l'adresse sans
                  compte, examinateur compris. La durée des sauvegardes et le compteur du mois sont ceux
                  de `/confidentialite`, à toucher ensemble : rien ne garde l'accord des deux pages. */}
              <ThemedText type="small" themeColor="textTertiary" style={styles.corps}>
                La suppression efface ton compte et tout ce qui s’y rattache : bilans, résultats,
                plan, points de suivi, retours, repères de parcours, sessions et identifiant de
                notification. Nos sauvegardes chiffrées en gardent une copie, sessions exceptées,
                jusqu’à 90 jours, puis s’effacent d’elles-mêmes. Il ne reste ensuite qu’un compteur
                des suppressions du mois, sans aucun identifiant.
              </ThemedText>

              <ThemedText type="small" themeColor="textTertiary" style={styles.pied}>
                Une question, ou un blocage ? Écris à {CONTACT_EMAIL}.
              </ThemedText>
            </View>
          </ScrollView>
        </AuDessusDuClavier>
      </SafeAreaView>
    </ThemedView>
  );

  function renduSuppression(confirme: boolean) {
    if (!confirme) {
      return (
        <View style={styles.bloc}>
          <ThemedText type="small" themeColor="textSecondary">
            Tes bilans, ton plan, tes points de suivi et tes retours seront supprimés
            définitivement. Cette action est irréversible.
          </ThemedText>
          <Button
            ref={boutonSupprimer}
            title="Supprimer mon compte"
            onPress={() => {
              geste.current = 'derniere-etape';
              setPhase((p) => (p.kind === 'pret' ? { ...p, confirme: true } : p));
            }}
            disabled={busy}
          />
        </View>
      );
    }
    return (
      <View style={styles.bloc}>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          {...({ ref: derniereEtape, ...FOCALISABLE_PAR_PROGRAMME } as TitreFocalisable)}
        >
          Dernière étape : confirme, et tout part.
        </ThemedText>
        <View style={styles.actions}>
          {/* Souligné, comme tout « Annuler » posé à côté d'un bouton de confirmation (`MonCompte`, le
              retrait d'un bilan) : un même geste, une seule forme (`v1-33` T-5). */}
          <TextLink
            label="Annuler"
            apparence="souligne"
            onPress={() => {
              geste.current = 'bouton';
              setPhase((p) => (p.kind === 'pret' ? { ...p, confirme: false } : p));
            }}
            disabled={busy}
          />
          <Button
            title={busy ? 'Suppression…' : 'Supprimer définitivement'}
            onPress={supprimer}
            disabled={busy}
            flex
          />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: Spacing.four, paddingBottom: Spacing.six },
  page: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  corps: { fontSize: 16, lineHeight: 24 },
  bloc: { gap: Spacing.three },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  pied: { marginTop: Spacing.four },
});
