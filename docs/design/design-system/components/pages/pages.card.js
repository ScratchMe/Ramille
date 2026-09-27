// Démonstration de la carte — exécutée par components/loader.js (RamilleRun) ; le namespace Ramille est en portée.

const { LegalPage, ErreurInattendue, SessionRefusee, ConfigurationManquante } = NS;
const cadre = { border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' };
ReactDOM.createRoot(document.getElementById('root')).render(
  <div style={{display:'grid',gridTemplateColumns:'repeat(3, minmax(0,1fr))',gap:16,alignItems:'start'}}>
    <div style={cadre}>
      <LegalPage title="Politique de confidentialité" updatedAt="25 septembre 2026"
        intro="Ramille collecte le strict nécessaire pour estimer l’empreinte carbone de tes déplacements et t’accompagner dans la durée. Cette page dit précisément quoi, pourquoi, pendant combien de temps, et ce que tu peux exiger."
        sections={[{heading:'Ce que nous ne collectons pas',blocks:[{kind:'bullets',items:['Aucune revente, location ou cession de tes données à qui que ce soit.','Aucune comparaison entre utilisateurs. Ton bilan n’est jamais rapproché de celui de quelqu’un d’autre, ni classé.']}]}]} />
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={cadre}><ErreurInattendue erreur={new TypeError("Cannot read properties of undefined (reading 'poste')")} /></div>
      <div style={cadre}><ConfigurationManquante problemes={[{type:'manquante',variable:'EXPO_PUBLIC_SUPABASE_ANON_KEY'}]} /></div>
    </div>
    <div style={cadre}><SessionRefusee /></div>
  </div>
);
