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
  corpsDeLaSaisie,
  issueDeLaVerification,
  LONGUEUR_DU_CODE,
  messageDeLaDemande,
  messageDeLaVerification,
  messageDuRenvoi,
  type ContexteDuCode,
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
 */
export function SaisieDuCode({
  contexte,
  adresse,
  libelleBouton,
  onOuverte,
  onAutreAdresse,
  renvoyer,
}: {
  contexte: ContexteDuCode;
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

  const verifier = async (valeur: string) => {
    if (enCours.current || !codeSemblePlausible(valeur)) return;
    enCours.current = true;
    setOccupe(true);
    setMessage(null);
    const { error } = await verifierLeCode({ email: adresse, code: valeur, contexte });
    const issue = issueDeLaVerification(error as ErreurAuth);
    enCours.current = false;
    setOccupe(false);
    if (issue === 'ouverte') {
      await onOuverte();
      return;
    }
    // Les chiffres restent dans le champ : la personne compare avec son e-mail, et un champ vidé
    // lui ferait croire qu'elle a mal tapé alors que le code est peut-être simplement périmé.
    setMessage(messageDeLaVerification(issue));
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
    setMessage(error ? messageDeLaDemande(error) : messageDuRenvoi(contexte));
  };

  return (
    <View style={styles.contenu}>
      <View style={styles.bloc}>
        <ThemedText type="screenTitle">Regarde tes emails</ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
          {corpsDeLaSaisie(contexte, adresse, APP_NAME)}
        </ThemedText>
      </View>

      {contexte === 'connexion' && (
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
        {contexte === 'rattachement' && (
          <ThemedText type="small" themeColor="textTertiary" style={styles.centre}>
            Si tu quittes cet écran, tu retrouves la saisie du code depuis « Toi ».
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
