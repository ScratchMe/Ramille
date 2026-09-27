// Démonstration de la carte — exécutée par components/loader.js (RamilleRun) ; le namespace Ramille est en portée.

const { FeuilleNouveauBilan } = NS;
ReactDOM.createRoot(document.getElementById('root')).render(
  <div style={{maxWidth:420}}>
    <FeuilleNouveauBilan engagement={{action:'Faire un trajet sur cinq à vélo',intention:'le mardi et le jeudi'}} style={{borderRadius:12,overflow:'hidden'}} />
  </div>
);
