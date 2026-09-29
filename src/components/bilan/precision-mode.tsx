import { StyleSheet, View } from 'react-native';

import { IntituleDuChamp, useAncreDuChamp } from '@/components/bilan/ancre-du-champ';
import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { ModeListItem } from '@/components/bilan/mode-list-item';
import { Spacing } from '@/constants/theme';
import type { ChampDuBilan } from '@/types/bilan';
import { optionCible } from '@/types/demande';

// Question de précision attachée au mode qui la déclenche — motorisation d'une voiture, type de
// deux-roues, et depuis C4.4 type de train et type de vélo. La liste ne s'écrit pas ici : ce
// composant ne connaît qu'une question et des options, et c'est l'écran qui décide sous quel mode
// il l'ouvre.
//
// **Il ne dessine plus de boîte** (29/09/2026, `v1-31` §2.2) : il est un intitulé et son groupe, et
// c'est `BoiteDePrecision` qui porte la boîte et le dépli — une seule boîte quand un choix ouvre deux
// précisions, et une seule façon de la dessiner.
//
// **Elle se rend juste sous l'élément sélectionné, à l'intérieur de la liste**, et c'est la
// première raison d'être de ce composant. Elle vivait auparavant après la liste entière : sur
// un écran de 390 × 844, avec neuf modes, elle tombait à 774 px pour un conteneur de 684 —
// 242 px hors champ, sous le pied collant. La personne voyait un mode sélectionné, un
// « Suivant » gris, et une liste qui semblait complète. Rien n'indiquait qu'il restait
// quelque chose à faire.
//
// Le défilement automatique aurait été un pansement : il ne dit rien au retour sur l'étape,
// quand la sélection est déjà faite. Sous l'élément, la question est là où l'œil vient de se
// poser — et « Voiture (seul) » est le premier de la liste. **Depuis `v1-31`, l'écran remonte
// aussi quand elle s'ouvrirait sous le pied** (`BoiteDePrecision`) : en plus de la placer ici,
// jamais à la place.
//
// **Les réponses sont des rangées, pas des puces** (retour d'appareil du 07/09/2026). En
// puces, deux défauts se cumulaient :
//
//   - *On ne les distinguait pas.* Une puce non sélectionnée porte le fond
//     `backgroundElement`, celui-là même de cette boîte : elles se lisaient comme du texte,
//     sans rien qui dise qu'on peut appuyer dessus. `ModeListItem` a déjà la réponse du
//     dépôt à ce problème — `nestedBackground`, qui repasse en blanc le fond non sélectionné
//     d'un item posé dans un encart teinté. La même décision avait été prise pour le
//     « Lequel ? » imbriqué de `commute-extra.tsx`, à deux composants d'ici.
//   - *Elles n'étaient pas ordonnées.* Quatre libellés de largeurs très inégales
//     (« Hybride » contre « Hybride rechargeable ») donnaient un retour à la ligne en
//     escalier : deux puces, puis une, puis une. Une par rangée, l'alignement est régulier,
//     et un libellé long ne risque plus d'être rogné — le piège de `baseFlex` dans `chip.tsx`.
//
// Le rôle d'accessibilité suivait gratuitement : `ModeListItem` s'annonce en `radio`, seul rôle
// qui dit « sélectionné », alors qu'une puce s'annonçait en `button` — ce n'est plus vrai depuis
// le 24/09/2026, où toutes les puces ont reçu un rôle de choix (`chip.tsx`). Ces réponses sont
// bien des choix exclusifs — et depuis le 24/09/2026 elles se rangent dans un `radiogroup` nommé
// par la question, comme celles de `PrecisionChiffres` : « Électrique » annoncé seul ne dit pas
// qu'il répond à « Quelle motorisation ? ».
//
// Le paramètre accepte un nombre autant qu'une chaîne : la part du second mode (C3.4) est une
// fraction, parce que c'est ce que le calcul multiplie — traduire une énumération en fraction
// quelque part entre l'écran et le SQL serait un troisième endroit où se tromper.
export function PrecisionMode<T extends string | number>({
  champ,
  question,
  options,
  valeur,
  onChange,
}: {
  /** Le champ qu'elle renseigne : « Il manque encore … » y mène, et en marque l'intitulé (`v1-31`). */
  champ: ChampDuBilan;
  question: string;
  options: readonly { value: T; label: string }[];
  valeur: T | null;
  onChange: (valeur: T) => void;
}) {
  const { bloc, cible, marque } = useAncreDuChamp(champ);
  const iCible = optionCible(options.map((option) => valeur === option.value));
  return (
    <View ref={bloc} style={styles.precision}>
      <IntituleDuChamp type="small" themeColor="textSecondary" marque={marque}>
        {question}
      </IntituleDuChamp>
      <GroupeDeChoix question={question} style={styles.reponses}>
        {options.map((option, i) => (
          <ModeListItem
            key={option.value}
            ref={i === iCible ? cible : undefined}
            label={option.label}
            selected={valeur === option.value}
            onPress={() => onChange(option.value)}
            nestedBackground
          />
        ))}
      </GroupeDeChoix>
    </View>
  );
}

const styles = StyleSheet.create({
  precision: { gap: Spacing.two },
  // 4 entre deux réponses, comme entre deux modes d'une famille (`v1-31` écart 2).
  reponses: { gap: Spacing.one },
});
