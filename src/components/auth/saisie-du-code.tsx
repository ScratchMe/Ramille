import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChampDeCode } from '@/components/auth/champ-de-code';
import { MessageInline } from '@/components/message-inline';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { APP_NAME } from '@/constants/produit';
import { Radius, Spacing } from '@/constants/theme';
import { verifierLeCode } from '@/lib/auth';
import {
  codeSemblePlausible,
  consequenceDeLaSaisie,
  corpsDeLaSaisie,
  issueDeLaVerification,
  LONGUEUR_DU_CODE,
  messageDeLaDemande,
  messageDeLaVerification,
  messageDuRenvoi,
  MESSAGE_DE_LA_SUITE_MANQUEE,
  suiteDuRenvoi,
  type IssueDeLaVerification,
  type ContexteDuCode,
  type VoixDeLaSaisie,
  type ErreurAuth,
} from '@/types/connexion';

/**
 * L'écran de saisie du code — **un composant, trois hôtes** (`/connexion/email`,
 * `/connexion/retrouver`, `/compte/suppression`).
 *
 * Trois écrans demandent une adresse et attendent un code ; en écrire trois garantirait qu'ils
 * divergent, comme `CarteDePiste` l'a appris en C5.2. Ce qui change d'un hôte à l'autre est le
 * libellé du bouton et ce qu'on fait de la session ouverte — le reste, y compris la règle de
 * non-divulgation, est ici et vaut pour les trois.
 *
 * **Le contexte n'est pas cosmétique : il décide du `type` envoyé à l'API.** `rattachement` vérifie
 * un `email_change`, `connexion` un `email`, et les deux ne se croisent pas (mesuré le
 * 20/09/2026 : `403 otp_expired` dans les deux sens). C'est ce qui rend la bascule de
 * `/connexion/email` sûre sans un mot de plus à l'écran.
 *
 * **Et depuis le 21/09/2026 le contexte ne décide PLUS les mots** : c'est `voix` qui s'en charge, et
 * les deux ne sont pas la même chose. Le contexte suit la **branche** (adresse libre ou prise) ; la
 * voix suit l'**écran hôte** et ne bouge pas d'une branche à l'autre. Les laisser confondus
 * rouvrirait par le texte l'oracle que `/connexion/email` ferme par le mécanisme — le corps, la
 * carte, le pied et le message de renvoi diffèrent tous entre les deux contextes, donc chacun
 * répondrait « cette adresse a-t-elle un compte ? » à qui sait lire. `src/types/connexion.ts` le
 * dit en long sur `VoixDeLaSaisie`.
 */
export function SaisieDuCode({
  contexte,
  voix,
  adresse,
  libelleBouton,
  onOuverte,
  onAutreAdresse,
  renvoyer,
}: {
  contexte: ContexteDuCode;
  /** Ce que l'écran a le droit d'affirmer — propriété de l'hôte, jamais de la branche. */
  voix: VoixDeLaSaisie;
  adresse: string;
  libelleBouton: string;
  onOuverte: () => void | Promise<void>;
  onAutreAdresse: () => void;
  /** Le même envoi que l'hôte vient de faire — rattachement ou connexion, jamais l'autre. */
  renvoyer: (email: string) => Promise<{ error: ErreurAuth }>;
}) {
  const [code, setCode] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // **Le verrou vit dans une `ref` et pas dans l'état d'affichage**, qui ne vaut `true` qu'au
  // rendu suivant : la vérification part d'elle-même au dernier chiffre, donc un collé suivi d'un
  // toucher du bouton enverrait deux appels — dont le second sur un code déjà consommé, c'est-à-dire
  // « Ce code ne marche pas » juste après qu'il a marché. Même raison que le verrou de soumission
  // du questionnaire.
  const enCours = useRef(false);
  const consequence = consequenceDeLaSaisie(voix, APP_NAME);

  /** Rouvre l'écran après un refus, ou après une panne : le verrou et le bouton ensemble. */
  const relacher = (texte: string | null) => {
    enCours.current = false;
    setOccupe(false);
    // Les chiffres restent dans le champ : la personne compare avec son e-mail, et un champ vidé
    // lui ferait croire qu'elle a mal tapé alors que le code est peut-être simplement périmé.
    setMessage(texte);
  };

  const verifier = async (valeur: string) => {
    if (enCours.current || !codeSemblePlausible(valeur)) return;
    enCours.current = true;
    setOccupe(true);
    setMessage(null);

    let issue: IssueDeLaVerification;
    try {
      const { error } = await verifierLeCode({ email: adresse, code: valeur, contexte });
      issue = issueDeLaVerification(error as ErreurAuth);
    } catch (erreur) {
      // **`verifyOtp` ne rend pas toujours son erreur : il peut lever.** Un verrou de stockage, un
      // adaptateur qui refuse en navigation privée, et la promesse part en rejet — l'écran restait
      // alors sur « Vérification… », bouton inerte, renvoi bloqué par le même verrou, sans un mot :
      // un cul-de-sac sur le seul chemin vers un compte existant (relevé en revue le 21/09/2026).
      console.error('La vérification du code a levé :', erreur);
      issue = 'echec';
    }

    if (issue === 'ouverte') {
      // **Le verrou ne se relâche PAS ici**, et c'est le correctif : il était rendu avant cet
      // `await`, si bien que le bouton redevenait actif pendant que l'hôte naviguait ou relisait le
      // compte. Un second toucher rejouait alors un code déjà consommé, et « Ce code ne marche
      // pas » se peignait par-dessus une connexion qui venait de réussir — exactement ce que le
      // verrou existe pour empêcher.
      try {
        await onOuverte();
      } catch (erreur) {
        // **Et le message n'est pas celui d'un refus**, second correctif du même endroit : il
        // retombait sur `messageDeLaVerification('echec')`, donc « La vérification n'a pas abouti »
        // — alors qu'elle a abouti, que le code est **consommé**, et que le seul geste proposé
        // (réessayer) ne peut plus rendre qu'un refus. Le champ se vide ici, à titre d'exception à
        // la règle du dessus, précisément pour que le bouton ne rejoue pas un code mort ; la sortie
        // est « Renvoyer un code ».
        console.error('La suite du code accepté a échoué :', erreur);
        setCode('');
        relacher(MESSAGE_DE_LA_SUITE_MANQUEE);
      }
      return;
    }

    relacher(messageDeLaVerification(issue));
  };

  const surSaisie = (valeur: string) => {
    setCode(valeur);
    if (message) setMessage(null);
    // **Au dernier chiffre, la vérification part d'elle-même** ; le bouton reste pour qui colle,
    // corrige, ou lit l'écran avec un lecteur d'écran.
    if (valeur.length === LONGUEUR_DU_CODE) void verifier(valeur);
  };

  const surRenvoi = async () => {
    if (occupe) return;
    setOccupe(true);
    setMessage(null);
    const { error } = await renvoyer(adresse);
    setOccupe(false);
    // Le champ se vide ici, et seulement ici : l'ancien code vient d'être invalidé par l'envoi du
    // nouveau (mesuré le 20/09/2026), donc garder ses chiffres ferait réessayer un code mort.
    setCode('');
    // **Le tri passe par `suiteDuRenvoi`, jamais par l'erreur nue.** Elle était donnée telle quelle
    // à `messageDeLaDemande`, et une adresse sans compte (`otp_disabled`) y recevait donc un message
    // distinct de celui d'une adresse connue : un oracle sur qui utilise Ramille, au renvoi, alors
    // que le premier envoi le taisait (relevé en revue le 21/09/2026).
    setMessage(
      suiteDuRenvoi(contexte, error) === 'message'
        ? messageDeLaDemande(error)
        : messageDuRenvoi(voix)
    );
  };

  return (
    <View style={styles.contenu}>
      <View style={styles.bloc}>
        <ThemedText type="screenTitle">Regarde tes emails</ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
          {corpsDeLaSaisie(voix, adresse, APP_NAME)}
        </ThemedText>
        {/* **La phrase qui remplace l'écran de collision**, et le prix de l'arbitrage du
            21/09/2026 : conditionnelle, donc vraie dans les deux branches, donc montrable dans les
            deux sans rien divulguer — et posée AVANT que le code soit tapé, ce qui laisse la sortie.
            Elle ne se rend qu'en voix « parti » ; `consequenceDeLaSaisie` rend `null` ailleurs. */}
        {consequence && (
          <ThemedText type="body" themeColor="textSecondary">
            {consequence}
          </ThemedText>
        )}
      </View>

      {voix === 'peut_etre' && (
        <ThemedView type="backgroundSelected" style={styles.carte}>
          <ThemedText type="small" weight={600}>
            Le code ne crée jamais de compte
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            S’il n’y en a pas à cette adresse, rien ne part et rien n’est créé. On ne dit pas non
            plus si l’adresse en a un — ce serait dire qui utilise {APP_NAME}.
          </ThemedText>
        </ThemedView>
      )}

      <View style={styles.champs}>
        <ChampDeCode value={code} onChangeText={surSaisie} />
        <MessageInline message={message} />
      </View>

      <View style={styles.pied}>
        <Button
          title={occupe ? 'Vérification…' : libelleBouton}
          onPress={() => void verifier(code)}
          disabled={occupe || !codeSemblePlausible(code)}
        />
        <TextLink
          label="Renvoyer un code"
          onPress={() => void surRenvoi()}
          role="link"
          type="small"
          themeColor="textTertiary"
          style={styles.centre}
        />
        <TextLink
          label="Utiliser une autre adresse"
          onPress={onAutreAdresse}
          role="link"
          type="small"
          themeColor="textTertiary"
          style={styles.centre}
        />
        {/* **Le pied suit la voix, et sa promesse a dû rétrécir pour rester vraie.** Il disait « tu
            retrouves la saisie du code depuis “Toi” » : c'est vrai quand l'adresse était libre — la
            session porte alors une adresse en attente, et « Toi » ouvre la porte —, et **faux quand
            elle était prise**, puisque `updateUser` a échoué et que rien n'est en attente. Le garder
            tel quel et le montrer dans les deux branches aurait été une phrase fausse une fois sur
            deux ; ne le montrer que dans l'une aurait rouvert l'oracle. Ce qui reste vrai des deux
            côtés, c'est que l'adresse est gardée localement et qu'on repasse par « Toi ». */}
        {voix === 'parti' && (
          <ThemedText type="small" themeColor="textTertiary" style={styles.centre}>
            Si tu quittes cet écran, ton adresse reste gardée ici : tu peux reprendre depuis « Toi ».
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenu: { flex: 1, gap: Spacing.four, marginTop: Spacing.two },
  bloc: { gap: 10 },
  carte: { borderRadius: Radius.card, padding: 20, gap: 8 },
  champs: { gap: Spacing.three },
  pied: { gap: Spacing.three, marginTop: 'auto' },
  centre: { textAlign: 'center' },
});
