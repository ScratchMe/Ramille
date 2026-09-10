// Démonstration de la carte — exécutée par components/loader.js (RamilleRun) ; le namespace Ramille est en portée.

const { ChoixDeRappel, MonCompte } = NS;
ReactDOM.createRoot(document.getElementById('root')).render(
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
    <ChoixDeRappel canal="push" />
    <div style={{display:'flex',flexDirection:'column',gap:12}}><MonCompte /><MonCompte confirmation /></div>
  </div>
);
