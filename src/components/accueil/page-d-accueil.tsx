// La page d'accueil du web — la racine du site, pour qui n'a ni bilan ni questionnaire en cours. Rendue par
// `src/app/index.tsx`, qui décide ; elle n'existe pas sur natif, où l'onboarding reste le premier écran.
//
// **Un récit, puis ce que fait Ramille** (`docs/architecture/v1-36-la-page-d-accueil.md`, 31/10/2026). La
// page d'avant (étape 5 de `v1-35`) disait la fiche Play et le film : juste, mais elle allait tout de suite
// à la mesure de l'empreinte, et ne parlait qu'à qui était déjà sensibilisé. Celle-ci part de ce qu'on a
// vécu — l'été 2026, le plus chaud jamais mesuré en France, dans les mots de Météo-France —, montre la part
// du transport dans notre empreinte, puis ce qui est à notre portée : « Tu ne peux pas arrêter une canicule.
// Tu peux changer un trajet. » Ce que fait Ramille vient ensuite, et c'est toujours la fiche Play, mot pour
// mot (`src/constants/accueil.ts`).
//
// **Ce qui ne change pas** : la lire n'ouvre pas de session (`laSessionSOuvreSur`) ; ses portes vers l'app
// passent par `allerVers` (`src/app/index.tsx`), qui ouvre la session au geste ; l'onboarding s'ouvre à sa
// deuxième page ; le pied porte de vrais liens ; le film ne se lance jamais seul.
//
// **Ce qui est neuf** :
// - **la scène de l'été en tête** (`scene-de-l-ete.web.tsx`, 31/10/2026) : deux personnes qui ont trop chaud
//   sous un soleil qui chauffe, puis « Tu te souviens de cette chaleur ? » — se souvenir avant de compter ;
// - **trois figures qui se dessinent** quand elles paraissent (`recit-de-l-ete.tsx`) — la scène comme elles,
//   une fois —, posées sous « réduire les animations » (`FRONT-MOUVEMENT.md` §2.12) ;
// - **une mesure sans session** (`compterSurLAccueil`) : la page affichée, les sections parues, le bouton
//   touché et son emplacement, le film lancé — un nombre par jour, sans rien qui désigne personne ;
// - **une barre d'appel en bas de l'écran**, entre le premier bouton et le dernier : un bouton toujours à
//   portée, sans revenir en haut.
//
// **La mascotte loin de tout chiffre** : son nom signe la page en haut, et elle parle dans la bande « Tu peux
// changer un trajet », la seule qui n'en porte aucun (`FRONT-MASCOTTE.md`). Les deux personnes de la scène ne
// sont pas elle.
import { Link, type Href } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilmDePresentation } from '@/components/accueil/film-de-presentation';
import { BandeDeLEte, EchelleDesEtes, PartDuTransport } from '@/components/accueil/recit-de-l-ete';
import { SceneDeLEte } from '@/components/accueil/scene-de-l-ete';
import { Button } from '@/components/button';
import { RamilleDit } from '@/components/ramille-dit';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ACCUEIL, FILM, FILM_EN_TEXTE, RECIT } from '@/constants/accueil';
import {
  CONSUMPTION_POSTES_TOTAL_T,
  FRANCE_AVERAGE_TRANSPORT_T,
  formatTonnesShort,
  SOURCE_DES_POSTES,
} from '@/constants/carbon-reference';
import { SOURCE_DE_L_ETE } from '@/constants/climat';
import { CONTACT_EMAIL } from '@/constants/editeur';
import { RAMILLE } from '@/constants/mascotte';
import { APP_NAME } from '@/constants/produit';
import { MaxContentWidth, Mouvement, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVuUneFois } from '@/hooks/use-vu-une-fois';
import { styleDuRecit } from '@/lib/mouvement';
import { compterSurLAccueil, nouvelAffichageDeLAccueil } from '@/lib/visites-de-l-accueil';

/** La colonne du texte : celle des pages légales, que l'œil lit sans perdre la ligne suivante. */
const MESURE_DE_LECTURE = 560;
/** Au-delà, le titre prend sa grande taille et la page respire davantage. */
const LARGEUR_D_ECRAN_LARGE = 720;
/** Le haut, sur un grand écran : le texte et la scène côte à côte, plus large que la mesure d'une section. */
const LARGEUR_DU_HAUT = 1040;
/** La hauteur réservée sous le contenu, pour que la barre d'appel ne cache jamais le pied. */
const HAUTEUR_DE_LA_BARRE = 104;

/** L'onboarding, à sa deuxième page (`premierePageDeLOnboarding`, `src/types/demarrage.ts`). */
const VERS_L_ONBOARDING: Href = {
  pathname: '/onboarding',
  params: { depuis: 'accueil' },
};
const VERS_LA_RETROUVAILLE: Href = {
  pathname: '/connexion/retrouver',
  params: { source: 'accueil' },
};

/** Les quatre boutons vers l'onboarding, chacun compté à son emplacement. */
const CLIC = {
  haut: 'clic_haut',
  agir: 'clic_agir',
  fin: 'clic_fin',
  collant: 'clic_collant',
} as const;
type Emplacement = keyof typeof CLIC;

export function PageDAccueil({
  allerVers,
}: {
  /** Ouvre la session, puis navigue (`src/app/index.tsx`) : la page n'en ouvre pas elle-même. */
  allerVers: (destination: Href) => void;
}) {
  const theme = useTheme();
  const reduit = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const large = width >= LARGEUR_D_ECRAN_LARGE;
  const [filmEnTexte, setFilmEnTexte] = useState(false);

  useEffect(() => {
    nouvelAffichageDeLAccueil();
    compterSurLAccueil('vue');
  }, []);

  const commencer = (emplacement: Emplacement) => {
    compterSurLAccueil(CLIC[emplacement]);
    allerVers(VERS_L_ONBOARDING);
  };

  const { attacher: attacherScene, vu: vuScene } = useVuUneFois();
  const { attacher: attacherEte, vu: vuEte } = useVuUneFois(() => compterSurLAccueil('lu_ete'));
  const { attacher: attacherEchelle, vu: vuEchelle } = useVuUneFois(() => compterSurLAccueil('lu_echelle'));
  const { attacher: attacherTrajets, vu: vuTrajets } = useVuUneFois(() => compterSurLAccueil('lu_trajets'));
  const { attacher: attacherAgir } = useVuUneFois(() => compterSurLAccueil('lu_agir'));
  const { attacher: attacherComment, vu: vuComment } = useVuUneFois(() => compterSurLAccueil('lu_comment'));
  const { attacher: attacherFin } = useVuUneFois(() => compterSurLAccueil('lu_fin'));

  // La barre d'appel : visible une fois la bande du haut — et son bouton — sortie de l'écran, jusqu'à ce que
  // la bande de la fin y entre. Les deux bornes sont mesurées sur la page ; la position du défilement est
  // gardée, pour qu'un redimensionnement ou un dépli (le film en texte) la recalcule sans attendre le pas suivant.
  const [bornes, setBornes] = useState({
    apresLeHaut: Infinity,
    avantLaFin: Infinity,
  });
  const [defilement, setDefilement] = useState(0);
  const barreVisible = defilement > bornes.apresLeHaut && defilement + height < bornes.avantLaFin;
  const surDefilement = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setDefilement(e.nativeEvent.contentOffset.y);
  };
  const finDuHaut = (e: LayoutChangeEvent) => {
    const { y, height: h } = e.nativeEvent.layout;
    setBornes((b) => ({ ...b, apresLeHaut: y + h }));
  };
  const debutDeLaFin = (e: LayoutChangeEvent) => {
    const { y } = e.nativeEvent.layout;
    setBornes((b) => ({ ...b, avantLaFin: y }));
  };

  const titreDeSection = [styles.titreDeSection, large && styles.titreDeSectionLarge];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          testID="accueil-defilement"
          contentContainerStyle={{ paddingBottom: HAUTEUR_DE_LA_BARRE }}
          // Un élément qui prend le focus au clavier s'arrête au-dessus de la barre, pas dessous (WCAG 2.4.11).
          style={styles.defilement}
          onScroll={surDefilement}
          scrollEventThrottle={100}
        >
          {/* ── Le haut : se souvenir de l'été, et le premier bouton ───────────────────────── */}
          <Bande
            onLayout={finDuHaut}
            large={large}
            largeur={large ? LARGEUR_DU_HAUT : MESURE_DE_LECTURE}
            testID="accueil-haut"
          >
            {/* **Le nom, pas le visage** : en haut, la scène est celle des gens et de leur été, pas celle de
                Ramille. Elle paraît plus bas, là où elle parle — la bande sans chiffre (`FRONT-MASCOTTE.md`). */}
            <ThemedText weight={600} style={styles.nom}>
              {APP_NAME}
            </ThemedText>
            {/* La scène d'abord, dans l'ordre de lecture aussi : le lecteur d'écran la décrit avant la question.
                Sur un grand écran, elle passe à droite du texte. */}
            <View style={[styles.haut, large && styles.hautLarge]}>
              <View ref={attacherScene} style={large && styles.sceneLarge}>
                <SceneDeLEte vu={vuScene} reduit={reduit} />
              </View>
              <View style={[styles.texteDuHaut, large && styles.texteDuHautLarge]}>
                <View style={styles.tete}>
                  <ThemedText weight={600} themeColor="accentText" style={styles.question}>
                    {RECIT.question}
                  </ThemedText>
                  <ThemedText type="title" weight={700} style={[styles.titre, large && styles.titreLarge]}>
                    {RECIT.titre}
                  </ThemedText>
                </View>
                <ThemedText themeColor="textSecondary" style={[styles.chapeau, large && styles.chapeauLarge]}>
                  {RECIT.chapeau}
                </ThemedText>
                <AppelAuBilan onPress={() => commencer('haut')} large={large}>
                  <TextLink
                    label={ACCUEIL.dejaUnCompte}
                    apparence="souligne"
                    role="link"
                    onPress={() => allerVers(VERS_LA_RETROUVAILLE)}
                    containerStyle={large ? styles.lienAGauche : styles.lienCentre}
                  />
                </AppelAuBilan>
              </View>
            </View>
          </Bande>

          {/* ── L'été en nombres ─────────────────────────────────────────────────────────── */}
          <Bande fond="backgroundElement2" large={large}>
            <View style={styles.section}>
              <ThemedText type="subtitle" style={titreDeSection}>
                {RECIT.ete.titre}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.corps}>
                {RECIT.ete.texte}
              </ThemedText>
            </View>
            {/* La figure paraît, et non son titre : c'est elle qui se dessine sous les yeux. */}
            <View ref={attacherEte} style={styles.figureDeLEte}>
              <BandeDeLEte vu={vuEte} reduit={reduit} grande={large} />
              <ThemedText type="small" themeColor="textTertiary">
                {RECIT.ete.legende}
              </ThemedText>
            </View>
            <View style={[styles.faits, large && styles.faitsLarges]}>
              {/* Du texte : il ne bouge pas (`v1-36` §4), seules les figures se dessinent. */}
              {RECIT.ete.faits.map((fait) => (
                <View
                  key={fait}
                  style={[
                    styles.fait,
                    large && styles.faitLarge,
                    { borderColor: theme.border, backgroundColor: theme.background },
                  ]}
                >
                  <ThemedText style={styles.corps}>{fait}</ThemedText>
                </View>
              ))}
            </View>
            <Source libelle={SOURCE_DE_L_ETE.libelle} url={SOURCE_DE_L_ETE.url} />
          </Bande>

          {/* ── L'échelle des étés ───────────────────────────────────────────────────────── */}
          <Bande large={large}>
            <View style={styles.section}>
              <ThemedText type="subtitle" style={titreDeSection}>
                {RECIT.echelle.titre}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.corps}>
                {RECIT.echelle.texte}
              </ThemedText>
            </View>
            {/* La figure paraît, et non son titre : c'est elle qui se dessine sous les yeux. */}
            <View ref={attacherEchelle}>
              <EchelleDesEtes vu={vuEchelle} reduit={reduit} />
            </View>
            <ThemedText type="small" themeColor="textTertiary">
              {RECIT.echelle.note}
            </ThemedText>
            <ThemedText weight={600} style={styles.chute}>
              {RECIT.echelle.suite}
            </ThemedText>
          </Bande>

          {/* ── Nos trajets ──────────────────────────────────────────────────────────────── */}
          <Bande fond="backgroundElement2" large={large}>
            <View style={styles.section}>
              <ThemedText type="subtitle" style={titreDeSection}>
                {RECIT.trajets.titre}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.corps}>
                {RECIT.trajets.texte(
                  formatTonnesShort(FRANCE_AVERAGE_TRANSPORT_T),
                  formatTonnesShort(CONSUMPTION_POSTES_TOTAL_T)
                )}
              </ThemedText>
            </View>
            <View ref={attacherTrajets}>
              <PartDuTransport vu={vuTrajets} reduit={reduit} />
            </View>
            <Source libelle={SOURCE_DES_POSTES} />
          </Bande>

          {/* ── Ce qui est à notre portée : la seule bande sans chiffre, où Ramille parle ── */}
          <Bande fond="backgroundTinted" large={large}>
            <View ref={attacherAgir} style={styles.section}>
              <ThemedText
                type="subtitle"
                style={[titreDeSection, styles.titreDAgir, large && styles.titreDAgirLarge]}
              >
                {RECIT.agir.titre}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={[styles.corps, styles.corpsDAgir]}>
                {RECIT.agir.texte}
              </ThemedText>
            </View>
            <RamilleDit ligne={RAMILLE.presentation} mood="encouraging" size={48} tilt={-6} />
            {/* Sans la durée : la bande où Ramille parle ne porte aucun chiffre. */}
            <AppelAuBilan onPress={() => commencer('agir')} large={large} sansDuree />
          </Bande>

          {/* ── Comment ça marche : la fiche Play, mot pour mot ──────────────────────────── */}
          <Bande large={large}>
            <View style={styles.section}>
              <ThemedText type="subtitle" style={titreDeSection}>
                {RECIT.comment.titre}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.corps}>
                {ACCUEIL.chapeau}
              </ThemedText>
            </View>
            <View ref={attacherComment}>
              <EtapesDeRamille vu={vuComment} reduit={reduit} />
            </View>
            <ThemedText themeColor="textSecondary" style={styles.corps}>
              {ACCUEIL.introduction}
            </ThemedText>
          </Bande>

          {/* ── Ce que Ramille ne fait pas, et ce qu'il n'est pas ────────────────────────── */}
          <Bande fond="backgroundElement2" large={large}>
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.titreDeSection}>
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
              <ThemedText type="subtitle" style={styles.titreDeSection}>
                {ACCUEIL.limites.titre}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.corps}>
                {ACCUEIL.limites.texte}
              </ThemedText>
            </View>
          </Bande>

          {/* ── Le film ──────────────────────────────────────────────────────────────────── */}
          <Bande large={large} largeur={MaxContentWidth}>
            <ThemedText type="subtitle" style={styles.titreDeSection}>
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
          </Bande>

          {/* ── La fin : le dernier bouton, puis le pied ─────────────────────────────────── */}
          <Bande fond="backgroundTinted" large={large} onLayout={debutDeLaFin} testID="accueil-fin">
            <View ref={attacherFin} style={styles.section}>
              <ThemedText type="subtitle" style={titreDeSection}>
                {RECIT.fin.titre}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.corps}>
                {RECIT.fin.texte}
              </ThemedText>
            </View>
            <AppelAuBilan onPress={() => commencer('fin')} large={large} />
          </Bande>

          <Bande large={large}>
            <View style={styles.pied}>
              <ThemedText type="small" themeColor="textTertiary">
                {ACCUEIL.editeur}
                <Link href={`mailto:${CONTACT_EMAIL}`} style={styles.souligne}>
                  {CONTACT_EMAIL}
                </Link>
              </ThemedText>
              {/* Les pages publiques, en **vrais liens** : `Link` rend une ancre avec son adresse, que suivent
                  un moteur et l'écran de consentement de Google — un `TextLink` est un bouton sans adresse
                  (`EXPO.md` §1.1). La cible fait 48 de haut, comme celle d'un `TextLink`. */}
              <View style={styles.liensDuPied}>
                <Link href="/confidentialite" asChild>
                  <ThemedText type="small" themeColor="textTertiary" style={styles.lienDuPied}>
                    Confidentialité
                  </ThemedText>
                </Link>
                <Link href="/conditions" asChild>
                  <ThemedText type="small" themeColor="textTertiary" style={styles.lienDuPied}>
                    Conditions d’utilisation
                  </ThemedText>
                </Link>
                <Link href="/licences" asChild>
                  <ThemedText type="small" themeColor="textTertiary" style={styles.lienDuPied}>
                    Licences
                  </ThemedText>
                </Link>
              </View>
            </View>
          </Bande>
        </ScrollView>

        {barreVisible ? <BarreDAppel onPress={() => commencer('collant')} reduit={reduit} /> : null}
      </SafeAreaView>
    </ThemedView>
  );
}

/** Une bande de la page, sur toute la largeur, et sa colonne centrée. */
function Bande({
  children,
  fond,
  large,
  largeur = MESURE_DE_LECTURE,
  onLayout,
  testID,
}: {
  children: ReactNode;
  fond?: ThemeColor;
  large: boolean;
  largeur?: number;
  onLayout?: (e: LayoutChangeEvent) => void;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      onLayout={onLayout}
      style={[styles.bande, large && styles.bandeLarge, fond ? { backgroundColor: theme[fond] } : null]}
    >
      <View style={[styles.colonne, { maxWidth: largeur }]}>{children}</View>
    </View>
  );
}

/** Le bouton vers l'onboarding, la durée du bilan et « sans compte » : le même trio, à chaque appel. */
function AppelAuBilan({
  onPress,
  large,
  sansDuree = false,
  children,
}: {
  onPress: () => void;
  large: boolean;
  sansDuree?: boolean;
  children?: ReactNode;
}) {
  return (
    <View style={styles.appel}>
      <Button title={RECIT.bouton} onPress={onPress} style={large ? styles.boutonLarge : undefined} />
      <ThemedText type="small" themeColor="textTertiary" style={large ? undefined : styles.centre}>
        {sansDuree ? ACCUEIL.sansCompte : `${RECIT.duree} ${ACCUEIL.sansCompte}`}
      </ThemedText>
      {children}
    </View>
  );
}

/** Les trois temps de Ramille, reliés par un trait qui descend quand la section paraît. */
function EtapesDeRamille({ vu, reduit }: { vu: boolean; reduit: boolean }) {
  const theme = useTheme();
  const etapes = ACCUEIL.sections;
  return (
    <View>
      {etapes.map((etape, i) => {
        const derniere = i === etapes.length - 1;
        return (
          <View key={etape.titre} style={styles.etape}>
            <View style={styles.colonneDEtape} aria-hidden>
              <View style={[styles.numero, { backgroundColor: theme.accent }]}>
                <ThemedText type="small" weight={600} themeColor="onAccent">
                  {String(i + 1)}
                </ThemedText>
              </View>
              {derniere ? null : (
                <View style={[styles.fil, { backgroundColor: theme.border }]}>
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFill,
                      { backgroundColor: theme.accent },
                      styleDuRecit(
                        'traceVertical',
                        { vu, reduit },
                        { duree: Mouvement.trace, delai: i * Mouvement.trace }
                      ),
                    ]}
                  />
                </View>
              )}
            </View>
            <View style={[styles.texteDEtape, derniere ? null : styles.avantLaSuivante]}>
              <ThemedText weight={600} style={styles.titreDEtape} accessibilityRole="header" headingLevel={3}>
                {etape.titre}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.corps}>
                {etape.texte}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * La barre d'appel du bas de l'écran. Elle entre en fondu, à la durée de la barre d'onglets
 * (`Mouvement.entreeDeBarre`), et s'en va d'un coup : une sortie ne s'anime pas plus que nécessaire. Elle ne prend
 * jamais le focus ; au clavier, la tabulation qui va au bout de la page amène la bande de la fin, dont le bouton
 * est le même — la barre s'efface alors, comme au doigt.
 */
function BarreDAppel({ onPress, reduit }: { onPress: () => void; reduit: boolean }) {
  const theme = useTheme();
  const entree = styleDuRecit('fondu', { vu: true, reduit }, { duree: Mouvement.entreeDeBarre });
  return (
    <Animated.View
      style={[styles.barre, { backgroundColor: theme.background, borderColor: theme.border }, entree]}
    >
      <View style={styles.contenuDeLaBarre}>
        <Button title={RECIT.bouton} onPress={onPress} />
      </View>
    </Animated.View>
  );
}

function Source({ libelle, url }: { libelle: string; url?: string }) {
  return (
    <ThemedText type="small" themeColor="textTertiary">
      {'Source : '}
      {url ? (
        <Link href={url} target="_blank" rel="noopener" style={styles.souligne}>
          {libelle}
        </Link>
      ) : (
        libelle
      )}
      {'.'}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // `scrollPaddingBottom` n'est pas dans les types de React Native : une propriété CSS que le web lit.
  defilement: { scrollPaddingBottom: HAUTEUR_DE_LA_BARRE } as ViewStyle,
  safeArea: { flex: 1 },

  bande: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.five + Spacing.three,
  },
  bandeLarge: { paddingVertical: Spacing.six },
  colonne: { width: '100%', alignSelf: 'center', gap: Spacing.four },
  section: { gap: Spacing.three },

  figureDeLEte: { gap: Spacing.two },
  nom: { fontSize: 18, lineHeight: 24 },
  haut: { gap: Spacing.four },
  // Sur un grand écran, la scène à droite du texte — elle reste la première dans l'ordre de lecture.
  hautLarge: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.six },
  sceneLarge: { flex: 1 },
  texteDuHaut: { gap: Spacing.four },
  texteDuHautLarge: { flex: 1.15 },
  tete: { gap: Spacing.two },
  // La question, en phrase et non en capitales : on la pose, on ne l'affiche pas.
  question: { fontSize: 20, lineHeight: 26 },
  // Le titre de la page, à la taille d'une affiche : une taille unique, qui vit ici (`FRONT.md`).
  titre: { fontSize: 36, lineHeight: 42, letterSpacing: -0.8 },
  titreLarge: { fontSize: 52, lineHeight: 58, letterSpacing: -1.4 },
  chapeau: { fontSize: 17, lineHeight: 26 },
  chapeauLarge: { fontSize: 20, lineHeight: 30, maxWidth: 640 },

  titreDeSection: { fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  titreDeSectionLarge: { fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  titreDAgir: { fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  titreDAgirLarge: { fontSize: 40, lineHeight: 46, letterSpacing: -1 },
  corps: { fontSize: 16, lineHeight: 25 },
  corpsDAgir: { fontSize: 17, lineHeight: 26 },
  chute: { fontSize: 18, lineHeight: 26 },

  faits: { gap: Spacing.two },
  faitsLarges: { flexDirection: 'row' },
  fait: { borderWidth: 1, borderRadius: Radius.card, padding: Spacing.three },
  faitLarge: { flex: 1 },

  appel: { gap: Spacing.two },
  boutonLarge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.five },
  centre: { textAlign: 'center' },
  lienCentre: { alignSelf: 'center' },
  lienAGauche: { alignSelf: 'flex-start' },

  etape: { flexDirection: 'row', gap: Spacing.three },
  colonneDEtape: { width: 28, alignItems: 'center' },
  numero: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fil: { flex: 1, width: 2, marginVertical: Spacing.one },
  texteDEtape: { flex: 1, gap: Spacing.one, paddingTop: 2 },
  avantLaSuivante: { paddingBottom: Spacing.four },
  titreDEtape: { fontSize: 18, lineHeight: 26 },

  liste: { gap: Spacing.two },
  passage: { gap: 2 },
  ligneDeListe: { flexDirection: 'row', gap: Spacing.two },
  texteDeListe: { flex: 1 },

  pied: { gap: Spacing.two },
  souligne: { textDecorationLine: 'underline' },
  liensDuPied: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
  },
  // `asChild` : le texte du thème devient l'ancre, avec son encre et sa police ; le rembourrage donne la cible.
  lienDuPied: { textDecorationLine: 'underline', paddingVertical: 14 },

  barre: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  contenuDeLaBarre: {
    width: '100%',
    maxWidth: MESURE_DE_LECTURE,
    alignSelf: 'center',
  },
});
