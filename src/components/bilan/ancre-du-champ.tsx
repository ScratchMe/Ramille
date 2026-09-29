import { createContext, useContext, useEffect, useRef, type RefObject } from 'react';
import type { View } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import type { ChampDuBilan } from '@/types/bilan';

/**
 * Où mène « Il manque encore … » (29/09/2026, `v1-31` §2.5) : chaque étape du questionnaire enregistre
 * ses champs auprès de `StepShell`, qui y fait défiler l'écran, y pose le focus et en marque l'intitulé
 * quand ce champ est celui qui manque.
 *
 * Trois choses par champ :
 *
 * - **le bloc**, ce qu'il faut amener en vue : l'intitulé et son groupe, ou le champ de saisie ;
 * - **la cible du focus** : l'option cochée du groupe, ou sa première (`optionCible`), ou le champ de
 *   saisie lui-même — c'est le composant qui rend le groupe qui sait laquelle est cochée, d'où la prop
 *   `ref` de `Chip`, `ChoiceRow`, `ModeListItem` et `NumericField` ;
 * - **`saisie`**, vrai pour un champ de saisie : sur natif, `donnerLeFocus` n'envoie qu'un événement
 *   d'accessibilité — sans TalkBack rien ne se passe, et le clavier ne s'ouvrirait pas. Le geste appelle
 *   donc aussi le `focus()` du `TextInput`, et c'est ce qu'on attend d'un champ.
 *
 * **Hors de `StepShell`, rien ne se passe** : les références restent inertes, et `marque` vaut faux.
 * C'est le cas de l'écran `/contexte`, qui rend `ChampsDeContexte` sans le questionnaire autour — et
 * qui ne change pas : son « Enregistrer » reste désactivé tant que le contexte est incomplet.
 */
export type AncreDuChamp = {
  bloc: RefObject<View | null>;
  cible: RefObject<unknown>;
  saisie: boolean;
};

export type AncresDeLEtape = {
  /** Enregistre l'ancre d'un champ ; rend de quoi la retirer. La dernière enregistrée l'emporte. */
  enregistrer: (champ: ChampDuBilan, ancre: AncreDuChamp) => () => void;
  /** Le champ dont l'intitulé passe en vert : celui qui manque, pendant la demande, s'il se marque. */
  marque: ChampDuBilan | null;
  /** La question que pose le titre de l'étape (`QUESTION_PRINCIPALE`), que lit `TitreDEtape`. */
  principale: ChampDuBilan | null;
};

export const ContexteDesAncres = createContext<AncresDeLEtape | null>(null);

/**
 * L'intitulé de ce champ est-il marqué ? Lu seul par `TitreDEtape`, qui porte la question principale
 * d'une étape sans en être l'ancre : la marque y vaut toujours faux (`seMarque`), et c'est cette
 * lecture qui le garantit — un titre qu'on ne brancherait pas rendrait muette la garde qui vérifie
 * qu'il ne change pas de couleur.
 */
export function useMarqueDuChamp(champ: ChampDuBilan | null): boolean {
  const ancres = useContext(ContexteDesAncres);
  return champ !== null && ancres?.marque === champ;
}

/**
 * Enregistre un champ auprès de l'étape qui l'affiche, et dit si son intitulé est marqué.
 *
 * `bloc` va au conteneur de l'intitulé et du groupe ; `cible`, en prop `ref`, à l'option que désigne
 * `optionCible` — ou au `TextInput` d'un champ de saisie (`saisie`).
 *
 * **Se décompose à l'appel** (`const { bloc, cible, marque } = useAncreDuChamp(…)`) : lu comme un
 * objet (`ancre.bloc`), le compilateur React le prend pour une référence dont on lirait la valeur
 * pendant le rendu, et `react-hooks/refs` refuse.
 */
export function useAncreDuChamp<T = View>(
  champ: ChampDuBilan,
  { saisie = false }: { saisie?: boolean } = {}
): { bloc: RefObject<View | null>; cible: RefObject<T | null>; marque: boolean } {
  const ancres = useContext(ContexteDesAncres);
  const bloc = useRef<View>(null);
  const cible = useRef<T>(null);
  const enregistrer = ancres?.enregistrer;
  useEffect(() => {
    if (!enregistrer) return;
    return enregistrer(champ, { bloc, cible, saisie });
  }, [enregistrer, champ, saisie]);
  return { bloc, cible, marque: useMarqueDuChamp(champ) };
}

/**
 * L'intitulé d'un champ du questionnaire : **en `accentText` 600 quand il est marqué** (`v1-31`,
 * écart 11), depuis sa couleur de tous les jours — `textSecondary` pour une précision, `textTertiary`
 * pour « Lequel ? » et les intitulés du contexte, `text` pour un sous-titre d'étape. La marque se pose
 * au toucher du « Suivant » en attente, jamais d'office, et elle s'écrit ici une fois.
 */
export function IntituleDuChamp({
  marque,
  themeColor,
  weight,
  ...props
}: ThemedTextProps & { marque: boolean }) {
  return <ThemedText {...props} themeColor={marque ? 'accentText' : themeColor} weight={marque ? 600 : weight} />;
}
