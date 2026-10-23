// La page d'accueil du web — la racine du site, pour qui n'a ni bilan ni questionnaire en cours (étape 5 de
// `docs/architecture/v1-35-l-audit-en-chantiers.md`, 23/10/2026). Rendue par `src/app/index.tsx`, qui
// décide ; elle n'existe pas sur natif, où l'onboarding reste le premier écran.
//
// **L'équivalent de la fiche Play, avec le film.** Ses textes sont ceux de la fiche, mot pour mot
// (`src/constants/accueil.ts`, et le test qui les compare) ; elle n'affirme rien que la fiche n'engage déjà.
// Le bouton mène à l'onboarding, qui ouvre la session : cette page n'en ouvre pas
// (`laSessionSOuvreSur`, `src/types/session.ts`), donc la lire ne crée ni compte anonyme ni captcha.
//
// **Sans chiffre, et la mascotte loin de tout chiffre** : elle signe la page en haut, comme sur la première
// page de l'onboarding, et ne parle pas.
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilmDePresentation } from '@/components/accueil/film-de-presentation';
import { Button } from '@/components/button';
import { Mascot } from '@/components/mascot';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ACCUEIL, FILM, FILM_EN_TEXTE } from '@/constants/accueil';
import { CONTACT_EMAIL } from '@/constants/editeur';
import { APP_NAME } from '@/constants/produit';
import { MaxContentWidth, Spacing } from '@/constants/theme';

/** La colonne du texte : celle des pages légales, que l'œil lit sans perdre la ligne suivante. */
const MESURE_DE_LECTURE = 480;

const commencer = () => router.push('/onboarding');

export function PageDAccueil() {
  const [filmEnTexte, setFilmEnTexte] = useState(false);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.defilement}>
          <View style={styles.colonne}>
            <View style={styles.marque}>
              <Mascot mood="calm" size={40} tilt={-7} />
              <ThemedText weight={600} style={styles.nom}>
                {APP_NAME}
              </ThemedText>
            </View>

            <View style={styles.tete}>
              <ThemedText type="title" weight={600} style={styles.titre}>
                {ACCUEIL.titre}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.chapeau}>
                {ACCUEIL.chapeau}
              </ThemedText>
            </View>

            <View style={styles.appel}>
              <Button title={ACCUEIL.bouton} onPress={commencer} />
              {/* Les deux lignes de la première page de l'onboarding, dans le même ordre et pour la même
                  raison : la phrase répond à la question que le lien fait naître (`etape-accroche.tsx`). */}
              <ThemedText type="small" themeColor="textTertiary" style={styles.centre}>
                {ACCUEIL.sansCompte}
              </ThemedText>
              <TextLink
                label={ACCUEIL.dejaUnCompte}
                apparence="souligne"
                role="link"
                onPress={() => router.push({ pathname: '/connexion/retrouver', params: { source: 'accueil' } })}
                containerStyle={styles.lienCentre}
              />
            </View>
          </View>

          <View style={styles.colonneDuFilm}>
            <ThemedText weight={600} style={styles.titreDeSection} accessibilityRole="header">
              {FILM.titre}
            </ThemedText>
            <FilmDePresentation />
            <ThemedText themeColor="textSecondary" style={styles.corps}>
              {FILM.ouArriveLeRappel}
            </ThemedText>
            {/* **Le film a une version texte**, pour qui ne le voit pas ou ne veut pas le lancer : ce qu'il
                montre et ce qu'il écrit, dans l'ordre. Repliée, pour que la page reste courte. */}
            <TextLink
              label="Le film en texte"
              apparence="souligne"
              expanded={filmEnTexte}
              onPress={() => setFilmEnTexte((ouvert) => !ouvert)}
              containerStyle={styles.lienAGauche}
            />
            {filmEnTexte ? (
              <View style={styles.liste}>
                {FILM_EN_TEXTE.map((passage) => (
                  <View key={passage.chapitre} style={styles.passage}>
                    <ThemedText type="small" weight={600}>
                      {passage.chapitre}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.corps}>
                      {passage.texte}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.colonne}>
            <ThemedText themeColor="textSecondary" style={styles.corps}>
              {ACCUEIL.introduction}
            </ThemedText>

            {ACCUEIL.sections.map((section) => (
              <View key={section.titre} style={styles.section}>
                <ThemedText weight={600} style={styles.titreDeSection} accessibilityRole="header">
                  {section.titre}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.corps}>
                  {section.texte}
                </ThemedText>
              </View>
            ))}

            <View style={styles.section}>
              <ThemedText weight={600} style={styles.titreDeSection} accessibilityRole="header">
                {ACCUEIL.garanties.titre}
              </ThemedText>
              <View style={styles.liste}>
                {ACCUEIL.garanties.points.map((point) => (
                  <View key={point} style={styles.ligneDeListe}>
                    <ThemedText themeColor="textTertiary" style={styles.corps}>
                      —
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" style={[styles.corps, styles.texteDeListe]}>
                      {point}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText weight={600} style={styles.titreDeSection} accessibilityRole="header">
                {ACCUEIL.limites.titre}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.corps}>
                {ACCUEIL.limites.texte}
              </ThemedText>
            </View>

            <Button title={ACCUEIL.bouton} onPress={commencer} style={styles.secondAppel} />

            <View style={styles.pied}>
              <ThemedText type="small" themeColor="textTertiary">
                {ACCUEIL.editeur}
                <Link href={`mailto:${CONTACT_EMAIL}`} style={styles.adresse}>
                  {CONTACT_EMAIL}
                </Link>
              </ThemedText>
              {/* Les pages publiques, en liens : le seul pied de page du produit avec celui des pages
                  légales — les écrans du parcours n'en ont pas. */}
              <View style={styles.liensDuPied}>
                <TextLink label="Confidentialité" apparence="souligne" role="link" onPress={() => router.push('/confidentialite')} />
                <TextLink label="Conditions d’utilisation" apparence="souligne" role="link" onPress={() => router.push('/conditions')} />
                <TextLink label="Licences" apparence="souligne" role="link" onPress={() => router.push('/licences')} />
              </View>
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
  defilement: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.five, gap: Spacing.five },
  colonne: { width: '100%', maxWidth: MESURE_DE_LECTURE, alignSelf: 'center', gap: Spacing.four },
  // Le film prend plus large que le texte : à 480 px, le 16:9 ne ferait que 270 px de haut.
  colonneDuFilm: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  marque: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  nom: { fontSize: 18, lineHeight: 24 },
  tete: { gap: Spacing.three },
  titre: { fontSize: 32, lineHeight: 38, letterSpacing: -0.3 },
  chapeau: { fontSize: 17, lineHeight: 25 },
  appel: { gap: Spacing.two },
  centre: { textAlign: 'center' },
  lienCentre: { alignSelf: 'center' },
  lienAGauche: { alignSelf: 'flex-start' },
  section: { gap: Spacing.two },
  titreDeSection: { fontSize: 18, lineHeight: 26 },
  corps: { fontSize: 15, lineHeight: 23 },
  liste: { gap: Spacing.two },
  passage: { gap: 2 },
  ligneDeListe: { flexDirection: 'row', gap: Spacing.two },
  texteDeListe: { flex: 1 },
  secondAppel: { marginTop: Spacing.two },
  pied: { marginTop: Spacing.four, gap: Spacing.two },
  adresse: { textDecorationLine: 'underline' },
  liensDuPied: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.three },
});
