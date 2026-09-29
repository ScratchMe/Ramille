import { StyleSheet, View } from 'react-native';

import { IntituleDuChamp, useAncreDuChamp } from '@/components/bilan/ancre-du-champ';
import { Chip } from '@/components/bilan/chip';
import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { Radius, Spacing } from '@/constants/theme';
import type { ChampDuBilan } from '@/types/bilan';
import { optionCible } from '@/types/demande';

/**
 * La jumelle chiffrée de `PrecisionMode` : mêmes garanties d'accessibilité, posée comme elle dans
 * `BoiteDePrecision` — mais des puces au lieu de rangées. **Elle ne dessine plus de boîte** depuis le
 * 29/09/2026 (`v1-31` §2.2) : sous « Voiture (covoiturage) », elle partage celle de la motorisation.
 *
 * **Pourquoi des puces ici et des rangées là-bas.** `precision-mode.tsx` a choisi les rangées
 * pour deux raisons nommées : des libellés de largeurs très inégales (« Hybride » contre
 * « Hybride rechargeable ») donnaient un retour à la ligne en escalier, et un libellé long
 * risquait d'être rogné. Aucune des deux ne vaut pour des chiffres : ils ont tous la même
 * largeur, ils tiennent à cinq sur une ligne sur la plupart des téléphones, et cinq rangées
 * hautes pour cinq chiffres feraient une liste plus longue que la question. C'est la même
 * décision que le questionnaire prend déjà partout ailleurs — jours par semaine, nombre de vols,
 * taille du covoiturage.
 *
 * **Sur la plupart, pas sur tous — d'où la grille** (27/09/2026). Cinq puces de 48 et leurs
 * quatre écarts demandent 272 px ; l'encart, retiré de 16 et rembourré de 16 de chaque côté, n'en
 * laisse que 264 sur un téléphone de 360 dp, une largeur courante sur Android. La cinquième puce
 * mordait de 8 px sur la marge droite de l'encart (mesuré sur l'export web ; à 390 dp tout
 * tient). Plutôt que de rogner la cible de 48 (décision n° 7), la série passe par la grille de
 * `GroupeDeChoix`, dont `colonnes` est un maximum : cinq colonnes égales quand elles tiennent, et
 * la rangée repasse d'elle-même à la ligne quand elles ne tiennent plus — comme les jours dans la
 * carte d'une action. **Depuis le 29/09/2026, elles tiennent à 360** (`v1-31`) : la boîte n'a plus
 * que 12 de marge intérieure (`BoiteDePrecision`), soit 272 px plus les 8 que la grille rend par sa
 * marge négative, pour 5 × 56 = 280 — à 0 px près. Une taille d'affichage agrandie fait encore passer
 * la cinquième à la ligne, et c'est la grille qui le permet.
 *
 * Le groupe est un `radiogroup` **nommé**, et c'est ce qui le distingue de ses voisins : une
 * étape peut porter plusieurs séries de puces rigoureusement identiques — c'est le cas des longs
 * trajets —, et en navigation de contrôle en contrôle plus rien ne dirait dans laquelle on se
 * trouve. Nommer le groupe le dit une fois ; le répéter sur chaque puce le dirait autant de
 * fois qu'il y a de puces (A2-9). Il passe par `GroupeDeChoix` depuis le 25/09/2026 — il posait
 * son rôle lui-même —, comme sa jumelle `PrecisionMode` le faisait déjà.
 */
export function PrecisionChiffres({
  champ,
  question,
  options,
  valeur,
  onChange,
}: {
  /** Le champ qu'elle renseigne : « Il manque encore … » y mène, et en marque l'intitulé (`v1-31`). */
  champ: ChampDuBilan;
  question: string;
  options: readonly { value: number; label: string; accessibilityLabel?: string }[];
  valeur: number | null;
  onChange: (valeur: number) => void;
}) {
  const { bloc, cible, marque } = useAncreDuChamp(champ);
  const iCible = optionCible(options.map((option) => valeur === option.value));
  return (
    <View ref={bloc} style={styles.precision}>
      <IntituleDuChamp type="small" themeColor="textSecondary" marque={marque}>
        {question}
      </IntituleDuChamp>
      <GroupeDeChoix question={question} colonnes={options.length}>
        {options.map((option, i) => (
          <Chip
            key={option.value}
            ref={i === iCible ? cible : undefined}
            label={option.label}
            accessibilityLabel={option.accessibilityLabel}
            role="radio"
            selected={valeur === option.value}
            onPress={() => onChange(option.value)}
            flex
            radius={Radius.chip}
            // Dans l'encart teinté, le fond de la page est ce qui fait voir la puce (cf. `Chip`) —
            // la même réponse que les rangées de `PrecisionMode`, sa jumelle.
            nestedBackground
          />
        ))}
      </GroupeDeChoix>
    </View>
  );
}

const styles = StyleSheet.create({
  precision: { gap: Spacing.two },
});
