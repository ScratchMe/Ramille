// Démonstration de la carte — exécutée par components/loader.js (RamilleRun) ; le namespace Ramille est en portée.

const { CheckinCard, ActionCard, ActionCommitment, FeuilleRappels, TextLink } = NS;
ReactDOM.createRoot(document.getElementById('root')).render(
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <CheckinCard periodLabel="Point de la semaine · 8 sept." question="Mardi ou jeudi, as-tu fait ce trajet à vélo ?" reponses={[{value:'non',label:'Non',variant:'secondary'},{value:'oui',label:'Oui',variant:'primary'}]} />
      <CheckinCard periodLabel="Point de la semaine · 1 sept." question="…" answered={true} />
      <CheckinCard periodLabel="Point du mois · août" question="…" answered={false} emphasize={false} />
      <ActionCard titre="Faire ce trajet à vélo" gainKg={184} partPercent={7} intention="le mardi et le jeudi" engagee><ActionCommitment state="committed" /></ActionCard>
      <ActionCard titre="Travailler depuis chez toi un jour par semaine" gainKg={240} partPercent={9} estompee><ActionCommitment state="idle" otherActionCommitted /></ActionCard>
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <ActionCard titre="Faire ce trajet à vélo" gainKg={184} partPercent={7}><ActionCommitment kind="days" state="picking" days={[1,3]} /></ActionCard>
      <div style={{background:'var(--color-scrim)',borderRadius:12,paddingTop:24}}><FeuilleRappels boucle="hebdo" canal="push" style={{paddingBottom:24}} /></div>
    </div>
  </div>
);
