// Démonstration de la carte — exécutée par components/loader.js (RamilleRun) ; le namespace Ramille est en portée.

const { SaisieDuCode } = NS;
const colonne = { display: 'flex', flexDirection: 'column', minHeight: 800, padding: 16, border: '1px solid var(--color-border)', borderRadius: 12 };
ReactDOM.createRoot(document.getElementById('root')).render(
  <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:16}}>
    <div style={colonne}><SaisieDuCode voix="parti" adresse="camille@exemple.fr" libelleBouton="Valider mon code" codeInitial="4817" /></div>
    <div style={colonne}><SaisieDuCode voix="peut_etre" adresse="camille@exemple.fr" libelleBouton="Retrouver mon compte" /></div>
  </div>
);
