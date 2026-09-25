import { Platform } from 'react-native';

import { arretDeTabulation, effetDeLaFleche, type OptionDuGroupe } from '@/types/groupe-au-clavier';

/**
 * Brancher le clavier d'un `radiogroup` sur web : un seul arrêt de tabulation, et les flèches qui
 * passent d'une option à l'autre en la cochant (25/09/2026, `v1-29` §6.4). Rend de quoi le
 * débrancher. Les règles sont dans `src/types/groupe-au-clavier.ts` ; ici, seulement ce qui touche
 * au navigateur.
 *
 * **Pourquoi le navigateur ne le fait pas seul** : ces options sont des `div` à `role="radio"`, pas
 * des `<input type="radio">`, et react-native-web leur donne à chacune `tabindex="0"` sans rien
 * faire des flèches. Il faut donc écrire ce qu'une case d'option native fait d'elle-même.
 *
 * **Les options du groupe sont celles dont il est le groupe LE PLUS PROCHE** (`closest`). Une
 * précision s'ouvre DANS le groupe de la question qui l'ouvre — « Quelle motorisation ? » sous
 * « Voiture (seul) », `GroupeDeChoix` dit pourquoi —, donc ses options sont aussi des descendants
 * du groupe du mode. Sans ce filtre, la flèche qui quitte « Voiture (seul) » cocherait
 * « Thermique », et les deux groupes se disputeraient leurs arrêts de tabulation — sous cette
 * mutation, la page ne répond plus (section I de `verifier-etats-export.mjs`).
 *
 * **Deux gestes, deux mécanismes :**
 * - la flèche, par un écouteur `keydown` posé sur le groupe : les touches remontent jusqu'à lui,
 *   `PressResponder` ne retenant qu'Entrée et Espace. La voisine reçoit le focus, puis un `click()`
 *   — c'est par lui que react-native-web appelle `onPress`, donc cocher par la flèche passe par le
 *   même chemin que cocher au doigt, `normaliserReponses` comprise. `preventDefault()` retient le
 *   défilement que la flèche ferait sinon, et seulement quand la touche vient d'une option du
 *   groupe (`effetDeLaFleche`) : sur un autre contrôle posé au milieu, elle garde son sens ;
 * - l'arrêt de tabulation, par un `MutationObserver` : il se range à chaque changement de
 *   `aria-checked`, d'`aria-disabled`, de `tabindex` ou des options elles-mêmes — une liste qui se
 *   déplie, une précision qui s'ouvre. Écrire `tabindex` dans le DOM plutôt que par une prop tient
 *   parce que React ne réécrit un attribut que lorsque **sa prop** change, pas quand le DOM diffère ;
 *   et quand il le réécrit (une option qui se réactive), l'observateur repasse derrière lui. Chaque
 *   passage n'écrit que ce qui diffère, donc celui que sa propre écriture déclenche n'écrit rien, et
 *   la boucle s'arrête d'elle-même.
 *
 * **Cocher par la flèche enregistre là où cocher au doigt enregistre.** Dans « Toi », le canal de
 * rappel s'écrit donc à chaque option traversée, comme il s'écrirait à chaque toucher : c'est le
 * comportement d'une case d'option native. La feuille des rappels, elle, n'enregistre qu'à « C'est
 * noté ».
 *
 * **Sur natif, rien** : TalkBack parcourt l'écran par balayage, pas par tabulation, et ce qu'un
 * clavier physique fait d'un groupe sous Android relève de la recette sur appareil.
 */
export function brancherLeClavierDuGroupe(noeud: unknown): () => void {
  if (Platform.OS !== 'web' || noeud === null || noeud === undefined) return () => {};
  const groupe = noeud as HTMLElement;

  const options = () =>
    Array.from(groupe.querySelectorAll<HTMLElement>('[role="radio"]')).filter(
      (option) => option.closest('[role="radiogroup"]') === groupe
    );
  const etat = (option: HTMLElement): OptionDuGroupe => ({
    cochee: option.getAttribute('aria-checked') === 'true',
    desactivee: option.getAttribute('aria-disabled') === 'true',
  });

  const rangerLaTabulation = () => {
    const liste = options();
    const arret = arretDeTabulation(liste.map(etat));
    liste.forEach((option, indice) => {
      // Une option désactivée garde ce que react-native-web lui donne (`-1`).
      if (etat(option).desactivee) return;
      const voulu = indice === arret ? '0' : '-1';
      if (option.getAttribute('tabindex') !== voulu) option.setAttribute('tabindex', voulu);
    });
  };

  const auClavier = (evenement: KeyboardEvent) => {
    const liste = options();
    const effet = effetDeLaFleche(evenement, liste.map(etat), liste.indexOf(evenement.target as HTMLElement));
    if (!effet.retenir) return;
    evenement.preventDefault();
    if (effet.vers === null) return;
    const voisine = liste[effet.vers];
    voisine.focus();
    if (!etat(voisine).cochee) voisine.click();
  };

  groupe.addEventListener('keydown', auClavier);
  const observateur = new MutationObserver(rangerLaTabulation);
  observateur.observe(groupe, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['aria-checked', 'aria-disabled', 'tabindex'],
  });
  rangerLaTabulation();

  return () => {
    groupe.removeEventListener('keydown', auClavier);
    observateur.disconnect();
  };
}
