// Démonstration de la carte — exécutée par components/loader.js (RamilleRun) ; le namespace Ramille est en portée.

const { CheckinCard, ActionCard, ActionCommitment, CarteDOuverture, TraitDeTemps, ThemedText, FeuilleRappels } = NS;
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
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <CarteDOuverture
        ouverture={{etiquette:'NOUVELLE SAISON',titre:'L’automne commence.',corps:'Cet été : 11 points répondus, 4 fois où tu as changé quelque chose.'}}
        sorties={[{cle:'reprendre',label:'Reprendre la même action',forme:'primaire'},{cle:'choisir_une_autre',label:'Choisir une autre',forme:'secondaire'}]}
        ligne="On repart pour une saison." visage="happy" />
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:8,background:'var(--color-background-element)',borderRadius:18,padding:20,alignSelf:'start'}}>
      <div style={{display:'flex',justifyContent:'space-between'}}>
        <ThemedText type="small" themeColor="textSecondary">Automne 2026</ThemedText>
        <ThemedText type="small" weight={600} themeColor="accentText">jusqu’au 30 novembre</ThemedText>
      </div>
      <TraitDeTemps progression={0.28} />
      <ThemedText themeColor="textTertiary" style={{fontSize:12,lineHeight:'16px'}}>La saison avance ; le trait mesure le temps, pas toi.</ThemedText>
    </div>
  </div>
);
