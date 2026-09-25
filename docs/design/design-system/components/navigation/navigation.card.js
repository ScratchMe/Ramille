// Démonstration de la carte — exécutée par components/loader.js (RamilleRun) ; le namespace Ramille est en portée.

const { BandeHaute, BarreOnglets, ProgressHeader, OngletIcone, ThemedText } = NS;
ReactDOM.createRoot(document.getElementById('root')).render(
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{border:'1px solid var(--color-border)',borderRadius:12,overflow:'hidden'}}><BandeHaute /></div>
      <div style={{border:'1px solid var(--color-border)',borderRadius:12,overflow:'hidden'}}><BarreOnglets actif="plan" /></div>
      <div style={{border:'1px solid var(--color-border)',borderRadius:12,overflow:'hidden'}}><BarreOnglets actif="suivi" /></div>
      <div style={{display:'flex',gap:12}}><OngletIcone nom="plan" focused /><OngletIcone nom="plan" focused={false} /><OngletIcone nom="suivi" focused /><OngletIcone nom="suivi" focused={false} /></div>
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <ProgressHeader section="Domicile-travail" step={3} total={9} />
      <ProgressHeader section="Loisirs du week-end" step={2} total={6} />
      <ProgressHeader section="Contexte" step={9} total={9} />
      <div style={{background:'var(--color-background-selected)',borderRadius:12,padding:'10px 16px'}}><ThemedText type="small" themeColor="accentText">Tes réponses précédentes sont pré-remplies. Modifie ce qui a changé.</ThemedText></div>
    </div>
  </div>
);
