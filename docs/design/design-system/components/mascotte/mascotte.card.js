// Démonstration de la carte — exécutée par components/loader.js (RamilleRun) ; le namespace Ramille est en portée.

const { Mascot, RamilleDit } = NS;
const moods = ['calm','happy','encouraging','thinking','resting'];
ReactDOM.createRoot(document.getElementById('root')).render(
  <div style={{display:'flex',flexDirection:'column',gap:20}}>
    <div style={{display:'flex',gap:24,alignItems:'flex-end'}}>
      {moods.map(m => <div key={m} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}><Mascot mood={m} size={64} /><span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--color-text-tertiary)'}}>{m}</span></div>)}
      <div style={{display:'flex',gap:12,alignItems:'flex-end',marginLeft:16}}>{[42,40,36,28,24].map(s => <div key={s} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}><Mascot mood="calm" size={s} /><span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--color-text-tertiary)'}}>{s}</span></div>)}</div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <RamilleDit mood="happy" ligne="Bien joué — chaque changement compte." />
      <RamilleDit mood="encouraging" ligne="Pas cette fois-ci. Rien d’obligatoire, on se repose la question au prochain point." />
      <RamilleDit mood="calm" size={44} themeColor="text" tilt={-6} ligne="Je te fais signe lundi." />
      <div data-theme="dark" style={{background:'var(--color-background)',padding:12,borderRadius:12}}><RamilleDit mood="resting" ligne="Je note tes réponses ici, au fil des saisons." /></div>
    </div>
  </div>
);
