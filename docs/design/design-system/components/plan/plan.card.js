// Démonstration de la carte — exécutée par components/loader.js (RamilleRun) ; le namespace Ramille est en portée.

const { CheckinCard, ActionCard, ActionCommitment, FeuilleRappels } = NS;
ReactDOM.createRoot(document.getElementById('root')).render(
  <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:20}}>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <CheckinCard periodLabel="Semaine du 14/09" question="Mardi ou jeudi, as-tu fait ce trajet à vélo ?" />
      <CheckinCard periodLabel="Semaine du 07/09" question="…" answered="oui" renforcement="Deuxième semaine de suite que tu fais ce trajet autrement." pied="Répondu lundi. Prochain point : lundi 21 septembre." />
      <CheckinCard periodLabel="août 2026" question="…" answered="non" emphasize={false} />
      <ActionCard titre="Faire un trajet sur cinq à vélo" gainKg={184} partPercent={7} intention="le mardi et le jeudi" premierPas="Repère un itinéraire cyclable avant ton premier jour." engagee><ActionCommitment state="committed" /></ActionCard>
      <ActionCard titre="Travailler depuis chez toi un jour par semaine" gainKg={240} partPercent={9} estompee><ActionCommitment state="idle" otherActionCommitted /></ActionCard>
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <ActionCard titre="Faire un trajet sur cinq à vélo" gainKg={184} partPercent={7}><ActionCommitment kind="days" state="picking" days={[2,4]} /></ActionCard>
      <FeuilleRappels boucle="hebdo" canal="push" style={{borderRadius:12,overflow:'hidden'}} />
    </div>
  </div>
);
