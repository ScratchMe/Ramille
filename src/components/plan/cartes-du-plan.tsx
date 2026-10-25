import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Mascot } from '@/components/mascot';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RAMILLE } from '@/constants/mascotte';
import { Radius, Spacing } from '@/constants/theme';
import type { CarteAttente } from '@/types/rappels';

// Quatre cartes du plan, sorties de l'écran à l'étape 7b de `v1-35` (25/10/2026). L'écran décide si
// chacune se rend (`cartesDuPlan`) et dans quel ordre ; elles disent ce qu'elles ont à dire.

/**
 * **Ramille dit l'attente, pas le vide** (v1-12 §6.2). « Rien à rattraper. »
 * vivait ici et se lisait comme une attente déçue la première fois qu'on la
 * voyait — retour d'appareil du 07/09. Elle nomme maintenant le jour où elle
 * revient, ce que le rythme fixe du produit (lundi, premier du mois) lui permet
 * de faire sans jamais compter.
 *
 * Le détail sous sa phrase est **du produit, pas d'elle** : une adresse peut
 * porter un chiffre, et elle n'en dit jamais.
 */
export function CarteDAttente({ attente }: { attente: CarteAttente }) {
  // Sortie en variable, et pas lue depuis `attente` dans le rendu : le rappel du `TextLink`
  // ferme sur elle, et TypeScript ne conserve pas le rétrécissement d'un **accès de propriété**
  // dans une fermeture — celui d'une `const`, si. Sans ça il faudrait une assertion non-nulle,
  // c'est-à-dire promettre à la main ce que le compilateur sait déjà.
  const porteDeLAttente = attente.action ?? null;
  return (
    <ThemedView type="backgroundElement" style={styles.calmeCard}>
      <View style={styles.calmeRow}>
        <Mascot mood="resting" size={40} />
        <View style={styles.calmeTexte}>
          <ThemedText weight={600}>{RAMILLE[attente.cle]}</ThemedText>
          {attente.detail && (
            <ThemedText type="small" themeColor="textSecondary">
              {attente.detail}
            </ThemedText>
          )}

          {/* **La porte, sous la ligne qui la porte** (13.4, recette web du 16/09/2026).
              « Rattache un compte pour recevoir le mot par email. » disait quoi faire et
              n'offrait aucun moyen de le faire : le seul chemin était l'icône de compte
              en haut à droite, que rien n'explique.

              Un lien, et non la carte entière rendue `Pressable` : quatre des sept
              variantes n'ont rien à offrir — elles deviendraient une cible morte — et un
              `Pressable` à trois textes impose un `accessibilityLabel` qui les
              recompose, ce que la règle T11 ne tolère qu'en dernier recours. Ici le
              libellé annoncé **est** le texte affiché.

              Même forme que le lien « Ouvrir les réglages du téléphone » des rappels :
              rendu sous la ligne qui l'appelle, jamais après le groupe. */}
          {porteDeLAttente && (
            <TextLink
              label={porteDeLAttente.libelle}
              apparence="action"
              onPress={() => router.push(porteDeLAttente.vers)}
              role="link"
              hint="Ouvre l’écran « Toi »."
              containerStyle={styles.calmePorte}
            />
          )}
        </View>
      </View>
    </ThemedView>
  );
}

/**
 * **L'encart de contexte, et sa porte** (C5.5, écarts 9 et 10). C'est la moitié « plan »
 * du constat 13.1 : « Parfois » au télétravail coûtait une action, et rien ne le disait.
 * La restriction se dit donc **après**, sur un écran qu'on relit — dite au moment du
 * choix, elle apprend à répondre haut ; dite ici, elle informe sans marchander.
 *
 * **Il ne nomme jamais l'action écartée ni son gain**, et c'est la contrainte du
 * chantier : ce serait la liste des portes fermées pour qui a répondu juste, et un prix
 * affiché sur une réponse pour les autres. Il dit sur quoi le plan s'appuie, la porte
 * permet de corriger, rien de plus.
 *
 * **Jamais sur un plan à zéro action** : il n'a rien à expliquer, et la carte de
 * félicitation juste en dessous serait la dernière chose à nuancer. Et jamais non plus
 * quand il n'y a rien à énumérer — une lecture qui a échoué ne devient pas une phrase
 * vide (C1.4).
 */
export function EncartDeContexte({ mots }: { mots: string[] }) {
  return (
    <ThemedView type="backgroundElement" style={styles.contexteCard}>
      <ThemedText type="small" themeColor="textSecondary">
        Ton plan tient compte de ton contexte :{' '}
        {mots.join(', ')}. Ce qui ne tient pas
        avec ces réponses n’est pas proposé.
      </ThemedText>
      {/* La porte se rend **sous** la phrase qui la porte, comme le lien des réglages du
          téléphone et celui de la carte d'attente : détachée, elle se lirait comme
          appartenant à ce qui suit. */}
      <TextLink
        label="Modifier ces réponses"
        apparence="action"
        onPress={() => router.push('/contexte')}
        // Elle ouvre `/contexte` : une navigation, donc un lien (24/09/2026, `v1-29`).
        role="link"
        containerStyle={styles.contextePorte}
      />
    </ThemedView>
  );
}

/**
 * Profil qui n'a plus rien à céder sur son poste dominant. Le pire accueil
 * possible serait une liste vide : c'est la personne qui fait déjà le plus
 * d'efforts. Même principe que le T8 de l'audit sur la restitution.
 *
 * **Le titre nomme le poste** (24/09/2026, `v1-29`) : « sur ce poste » ne disait lequel
 * à personne, sur un écran où rien d'autre ne le nomme — un plan sans action ne chiffre
 * pas son cap. Et « le check-in » est devenu « le point », le mot que le produit emploie
 * partout ailleurs pour la même chose.
 */
export function CarteDeFelicitation({ titre, promettreLePoint }: { titre: string; promettreLePoint: boolean }) {
  return (
    <ThemedView type="backgroundElement" style={styles.emptyActionsCard}>
      <View style={styles.praiseRow}>
        <Mascot mood="happy" size={36} />
        <ThemedText type="cardTitle" style={styles.praiseText}>
          {titre}
        </ThemedText>
      </View>
      <ThemedText type="body" themeColor="textSecondary">
        Aucun changement de mode ne te ferait gagner assez pour valoir la peine d’être
        proposé.{promettreLePoint ? ' Le point reste là si tu veux garder un œil dessus.' : ''}
      </ThemedText>
    </ThemedView>
  );
}

/**
 * **Elle disait le fait et non la saison, et la prémisse s'est inversée** (C2.8 point 3,
 * puis contre-lecture du 19/09/2026). Son titre était « Une nouvelle saison a commencé »,
 * ce qui pouvait être faux : la carte se déclenchait alors sur 182 jours d'ancienneté du
 * bilan, pas sur une bascule. **C6.3 a fait exactement l'inverse** — le déclencheur est
 * la bascule — donc c'est l'âge qui est devenu la chose qui peut être fausse, jusqu'à
 * « Ton bilan a moins d'un mois » sous une invitation à en refaire un. Le titre vient
 * maintenant de `titreDuRebilan`, partagé avec le suivi, qui donne à chaque régime ce
 * qu'il peut dire de vrai. La puce « Cadence : Été 2026 » avec laquelle il ne fallait pas
 * coexister a, elle, disparu avec C2.8. Fond `backgroundElement`
 * plutôt que `backgroundSelected` (canvas B1) : une proposition, pas une mise en avant.
 */
export function CarteDuRebilan({ titre }: { titre: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.rebilanCard}>
      <ThemedText type="small" themeColor="textSecondary">
        {titre} En faire un nouveau prend quelques minutes ; ton plan s’ajuste.
      </ThemedText>
      {/* **« Refaire » laissait croire à un écrasement** (C6.1, `v1-19` D1) : un nouveau
          bilan s'ajoute, il n'efface rien. Le libellé est le même sur les deux écrans qui
          portent cette porte, et c'est voulu — deux mots différents pour un même geste se
          liraient comme deux gestes. */}
      <TextLink
        label="Faire un nouveau bilan"
        apparence="action"
        onPress={() => router.push('/bilan')}
        role="link"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  calmeCard: { borderRadius: Radius.card, padding: 20 },
  calmeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  calmeTexte: { flex: 1, minWidth: 0, gap: 2 },
  // `alignSelf` pour que la cible tactile du lien ne s'étende pas sur toute la largeur de la
  // carte : une zone tactile plus large que son texte se touche par accident.
  calmePorte: { alignSelf: 'flex-start' },
  contexteCard: { borderRadius: Radius.card, padding: 20, gap: Spacing.two },
  // `alignSelf` pour que la cible tactile du lien ne s'étende pas sur toute la largeur de la
  // carte : une zone tactile plus large que son texte se touche par accident.
  contextePorte: { alignSelf: 'flex-start' },
  emptyActionsCard: { borderRadius: Radius.card, padding: 20, gap: 8 },
  praiseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  praiseText: { flex: 1, minWidth: 0 },
  rebilanCard: { borderRadius: Radius.card, padding: 20, gap: Spacing.two },
});
