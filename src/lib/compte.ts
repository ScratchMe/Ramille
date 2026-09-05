// Suppression de compte et export des données (T12, RGPD art. 15/17/20).
// Réf. migration `supabase/migrations/20260905210000_suppression_et_export_compte.sql`.
//
// La suppression est un bloqueur Google Play : depuis 2023, toute app permettant de créer un
// compte doit offrir un chemin de suppression **dans l'app**. TraceVerte en crée un pour chaque
// visiteur dès l'ouverture (session anonyme), donc la règle s'applique même à quelqu'un qui ne
// s'est jamais inscrit.
import { Platform, Share } from 'react-native';

import { supabase } from '@/lib/supabase';

export type CompteResult = { ok: true } | { ok: false; message: string };

export async function exportMyData(): Promise<CompteResult> {
  const { data, error } = await supabase.rpc('export_my_data');

  if (error || !data) {
    return { ok: false, message: 'L’export n’a pas pu être généré. Réessaie dans un instant.' };
  }

  const json = JSON.stringify(data, null, 2);
  const nom = `traceverte-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    // Téléchargement réel plutôt qu'une dépendance de plus : `react-native-web` tourne dans un
    // navigateur, un Blob et une ancre suffisent. `expo-file-system` et `expo-sharing` ne sont
    // pas installés, et les ajouter pour un écran ne se justifie pas.
    try {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = nom;
      lien.click();
      URL.revokeObjectURL(url);
      return { ok: true };
    } catch {
      return { ok: false, message: 'Le téléchargement a été bloqué par ton navigateur.' };
    }
  }

  try {
    await Share.share({ message: json, title: nom });
    return { ok: true };
  } catch {
    return { ok: false, message: 'Le partage a été interrompu.' };
  }
}

export async function deleteMyAccount(): Promise<CompteResult> {
  const { error } = await supabase.rpc('delete_my_account');

  if (error) {
    return { ok: false, message: 'La suppression n’a pas abouti. Réessaie dans un instant.' };
  }

  // La session pointe désormais sur un utilisateur qui n'existe plus : la fermer explicitement
  // évite que le client rejoue un jeton mort à la première requête suivante. L'échec du
  // signOut n'est pas bloquant — le compte, lui, est bien supprimé.
  await supabase.auth.signOut().catch(() => undefined);
  return { ok: true };
}
