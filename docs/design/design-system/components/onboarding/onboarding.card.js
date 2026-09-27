// Démonstration de la carte — exécutée par components/loader.js (RamilleRun) ; le namespace Ramille est en portée.

const { EtapeAccroche, EtapeContexte, EtapeReassurance, EtapeTransition } = NS;
const cadre = { border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' };
ReactDOM.createRoot(document.getElementById('root')).render(
  <div style={{display:'grid',gridTemplateColumns:'repeat(4, minmax(0,1fr))',gap:16}}>
    <div style={cadre}><EtapeAccroche style={{minHeight:820}} /></div>
    <div style={cadre}><EtapeContexte style={{minHeight:820}} /></div>
    <div style={cadre}><EtapeReassurance style={{minHeight:820}} /></div>
    <div style={cadre}><EtapeTransition style={{minHeight:820}} /></div>
  </div>
);
