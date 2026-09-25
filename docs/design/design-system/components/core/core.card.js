// Démonstration de la carte — exécutée par components/loader.js (RamilleRun) ; le namespace Ramille est en portée.
const { ThemedText, Button, TextLink, MessageInline, OnboardingDots } = NS;
ReactDOM.createRoot(document.getElementById('root')).render(
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      <ThemedText type="screenTitle">Ton plan</ThemedText>
      <ThemedText type="salient" style={{fontVariantNumeric:'tabular-nums'}}>− 184 kg</ThemedText>
      <ThemedText type="cardTitle">Faire deux trajets à vélo</ThemedText>
      <ThemedText type="body" themeColor="textSecondary">Une action par saison, une seule. C’est pas à pas qu’on tient un cap.</ThemedText>
      <ThemedText type="small" themeColor="textTertiary">par an · 7 % de ton empreinte</ThemedText>
      <ThemedText type="code" themeColor="textTertiary">SDES, données 2017 · cible 2050 : ADEME</ThemedText>
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <Button title="Continuer" />
      <Button title="Revoir mon plan" variant="secondary" />
      <Button title="Créer mon compte" disabled />
      <div style={{display:'flex',gap:16}}><Button title="Retour" variant="secondary" style={{width:'auto'}} /><Button title="Suivant" flex /></div>
      <div style={{display:'flex',gap:8,background:'var(--color-background-selected)',borderRadius:18,padding:18}}><Button title="Non" variant="secondary" onPanel flex /><Button title="Oui" variant="secondary" onPanel flex /></div>
      <TextLink label="Faire un nouveau bilan" role="link" type="small" themeColor="textTertiary" style={{textAlign:'center'}} />
      <TextLink label="Utiliser un email à la place" role="link" type="linkPrimary" style={{textAlign:'center'}} />
      <MessageInline message="L’envoi n’a pas abouti. Vérifie l’adresse et réessaie." />
      <OnboardingDots total={4} activeIndex={1} />
    </div>
  </div>
);
