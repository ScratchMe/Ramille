// Formatage partagé bilan/résultats — utilisé par la restitution et la proposition de
// connexion (qui reprend le même chiffre).
export function formatTonnes(kg: number): string {
  const tonnes = (kg / 1000).toFixed(1).replace('.', ',');
  return `${tonnes} t CO₂e`;
}
