// Démonstration de la carte — exécutée par components/loader.js (RamilleRun) ; le namespace Ramille est en portée.

const { EcartParPoste, BarreContour, BlocMethode, ThemedText } = NS;
ReactDOM.createRoot(document.getElementById('root')).render(
  <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:20,alignItems:'start'}}>
    <div style={{display:'flex',flexDirection:'column',gap:12,background:'var(--color-background-element)',borderRadius:18,padding:20}}>
      <ThemedText weight={600} type="small">Par poste</ThemedText>
      <EcartParPoste ecarts={[
        {poste:'commute',precedentKg:1480,courantKg:1120,dominant:true},
        {poste:'travel',precedentKg:600,courantKg:980,dominant:false},
        {poste:'leisure',precedentKg:310,courantKg:290,dominant:false},
      ]} />
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        <ThemedText type="small" themeColor="textSecondary">Le bilan précédent, en contour (14 px, restitution)</ThemedText>
        <BarreContour percent={72} hauteur={14} />
      </div>
      <BlocMethode dateDuBilan="2026-09-14T09:30:00Z" ouvertAuDepart />
    </div>
  </div>
);
