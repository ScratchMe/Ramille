// Les marques locales du **premier parcours** (C5.6, puis C5.7) — ce qui n'a lieu qu'une fois par
// appareil, entre la soumission du premier questionnaire et le premier plan compris.
//
// Elles sont **locales à l'appareil** et c'est le bon régime : ce ne sont pas des états du compte
// mais des nouvelles annoncées une fois, comme la carte d'ouverture de saison (C2.8) ou la feuille
// des rappels. Un second appareil peut revoir l'explication, ce qui est sans conséquence — il n'y a
// derrière aucun chiffre, aucune date et aucun geste irréversible.
//
// Le préfixe historique `traceverte.` est conservé (le renommer effacerait les brouillons), et
// c'est par ce **préfixe** que `src/lib/compte.ts` balaie les marques depuis ses deux sorties,
// suppression de compte et déconnexion de l'appareil. Ne jamais dénombrer les clés `traceverte.*`
// dans un commentaire : le balayage se fait par préfixe précisément pour que le nombre n'ait pas à
// être juste.
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * « La carte du premier plan a été refermée sur cet appareil. »
 *
 * **Une marque booléenne, et non l'identifiant d'un cycle** — à la différence de l'ouverture de
 * saison, qui se répète quatre fois par an et doit donc dire *laquelle* a été vue. Le premier plan
 * n'arrive qu'une fois : il n'y a pas de second à distinguer.
 *
 * Elle est nécessaire parce que le signal, lui, ne se referme que sur un **engagement**
 * (`estPremierPlan`, `src/types/saison.ts`) : sans elle, quelqu'un qui appuie sur « Compris » sans
 * choisir d'action reverrait la carte à chaque retour sur l'onglet — c'est-à-dire à chaque
 * notification ouverte.
 */
const PREMIER_PLAN_KEY = 'traceverte.premier_plan_vu.v1';

export async function aVuLePremierPlan(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREMIER_PLAN_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function marquerLePremierPlanVu(): Promise<void> {
  try {
    await AsyncStorage.setItem(PREMIER_PLAN_KEY, '1');
  } catch {
    // best-effort : au pire la carte réapparaît, et le premier engagement la referme pour de bon.
  }
}
