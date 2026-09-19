import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
import { useTrackView } from '@/hooks/use-track-view';
import { lireEtatDuRattachement, seDeconnecterDeCetAppareil } from '@/lib/compte';
import { loadReminderPrefs, setReminderChannel, type ReminderPrefs } from '@/lib/notification-prefs';
import { supabase } from '@/lib/supabase';
import { type EtatRattachement } from '@/types/compte';
import { type CanalPrefere } from '@/types/rappels';

// « Toi » — tout ce qui touche au compte, sorti de /suivi (v1-11 §2.5).
//
// Il vivait au bas du suivi, avec cette justification : « /suivi est la seule surface qui
// parle du compte dans la durée, un écran de plus serait un écran de plus à trouver ». Elle
// tombe avec la barre d'onglets : le compte a maintenant une porte visible depuis les deux
// lieux, et le suivi retrouve son sujet — les bilans et les points répondus.
//
// Cet écran vit **hors du groupe (tabs)** : il s'ouvre par-dessus, sans barre. C'est un
// détour, pas un troisième lieu.
export default function Compte() {
  useTrackView('compte_view');

  const [etat, setEtat] = useState<EtatRattachement | null>(null);
  const [rappels, setRappels] = useState<ReminderPrefs | null>(null);
  const [messageCanal, setMessageCanal] = useState<string | null>(null);
  const [cle, setCle] = useState(0);
  const [deconnexionEnCours, setDeconnexionEnCours] = useState(false);
  const [erreurDeconnexion, setErreurDeconnexion] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    lireEtatDuRattachement()
      .then((e) => !annule && setEtat(e))
      // **Jamais `local` sur un échec** (A6-8) : c'est l'état le plus affirmatif, celui qui dit
      // « tu n'as pas de compte » et propose d'en créer un. `lireEtatDuRattachement` rend
      // désormais `indisponible` sans lever, et ce repli couvre le cas où elle lève quand même.
      .catch(() => !annule && setEtat({ kind: 'indisponible' }));
    loadReminderPrefs()
      .then((p) => !annule && setRappels(p))
      .catch(() => undefined);
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
    setCle((n) => n + 1);
  };

  // **`replace('/')` et non `back()`** : la racine décide où aller selon qu'un bilan complété
  // existe, et après une déconnexion il n'en existe plus pour cette session — elle route donc vers
  // l'onboarding. Revenir en arrière aurait ramené sur le plan d'un compte qu'on vient de quitter,
  // avec des données encore en mémoire d'écran.
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

    router.replace('/');
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
    const ok = await setReminderChannel(canal);
    if (ok) return;
    setRappels(avant);
    setMessageCanal('Ton choix n’a pas été enregistré. Vérifie ta connexion et réessaie.');
  };


  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.contenu} showsVerticalScrollIndicator={false}>
          <View style={styles.page}>
            <TextLink
              label="Retour"
              onPress={() => router.back()}
              role="link"
              type="small"
              themeColor="textTertiary"
              containerStyle={styles.retour}
            />
            <ThemedText type="screenTitle">Toi</ThemedText>

            {/* Trois états et pas deux (issue #62). Entre `updateUser({ email })` et le clic
                de confirmation, la ligne porte déjà l'adresse alors que le compte n'est pas
                rattaché : cet écran proposait alors de « rattacher un compte », comme si la
                demande n'avait jamais eu lieu — et la boucle ouverte par « Vérifie tes
                emails » ne se refermait nulle part. `etatDuRattachement` nomme cet
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
              <ThemedText type="body" themeColor="textSecondary">
                Adresse à confirmer : {etat.email}. Le lien est parti par email ; ton bilan te
                suivra d’un appareil à l’autre une fois que tu auras cliqué dessus.
              </ThemedText>
            )}

            {etat?.kind === 'local' && (
              <>
                <ThemedText type="body" themeColor="textSecondary">
                  Ton bilan reste sur cet appareil. Un compte le fait te suivre ailleurs.
                </ThemedText>
                <Button
                  title="Rattacher un compte"
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
                <Button title="Réessayer" onPress={reessayer} style={styles.bouton} />
              </>
            )}

            {/* Le réglage s'affiche pour tout le monde, y compris une session anonyme : le
                push n'a besoin que d'un jeton d'appareil (v1-12 §2.5). C'était l'inverse
                avant, l'interrupteur email n'apparaissant qu'avec un compte rattaché.

                **Sauf quand la lecture du compte a échoué** : `loadReminderPrefs` ne distingue
                pas un échec de « pas de session » et rend alors ses valeurs par défaut — canal
                « aucun », pas de jeton, pas d'email. La liste afficherait donc un choix que
                personne n'a fait, à côté d'un message qui dit qu'on n'a rien pu lire. On attend
                donc de savoir : les deux lectures partent ensemble, et `etat` vaut toujours
                quelque chose à l'arrivée, échec compris. */}
            {rappels && etat !== null && etat.kind !== 'indisponible' && (
              <>
                <ChoixDeRappel prefs={rappels} onChoisir={choisirLeCanal} />
                <MessageInline message={messageCanal} />
              </>
            )}

            <MonCompte />

            <View style={styles.liens}>
              {/* **La seconde porte du contexte, et elle n'est pas un confort** (C6.4). La
                  première est l'encart du plan, qui ne se rend que s'il y a au moins une action à
                  expliquer : tout cycliste et tout profil sédentaire a un plan à zéro action depuis
                  C2.5, donc sans celle-ci l'écran serait **inatteignable** pour exactement les
                  personnes dont le contexte explique le plus le plan. L'écran gère lui-même le cas
                  d'un compte sans bilan, qui est le seul où ce lien ne mène à rien à corriger. */}
              <TextLink
                label="Mon contexte de mobilité"
                onPress={() => router.push('/contexte')}
                role="link"
                type="small"
                weight={600}
                themeColor="accentText"
              />
              <TextLink
                label="Un retour à nous faire ?"
                onPress={() => router.push('/feedback')}
                role="link"
                type="small"
                weight={600}
                themeColor="accentText"
              />
              <TextLink
                label="Confidentialité"
                onPress={() => router.push('/confidentialite')}
                role="link"
                type="small"
                themeColor="textTertiary"
              />
              <TextLink
                label="Conditions d’utilisation"
                onPress={() => router.push('/conditions')}
                role="link"
                type="small"
                themeColor="textTertiary"
              />
              <ThemedText type="code" themeColor="textTertiary" style={styles.contact}>
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
  liens: { gap: Spacing.one, marginTop: Spacing.two },
  contact: { marginTop: Spacing.two },
});
