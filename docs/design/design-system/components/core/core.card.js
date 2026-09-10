// Démonstration de la carte — exécutée par components/loader.js (RamilleRun) ; le namespace Ramille est en portée.
const { ThemedText, Button, TextLink, MessageInline, OnboardingDots } = NS;
ReactDOM.createRoot(document.getElementById('root')).render(
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      <ThemedText type="screenTitle">Ton plan</ThemedText>
      <ThemedText type="salient">− 184 kg</ThemedText>
      <ThemedText type="cardTitle">Faire deux trajets à vélo</ThemedText>
      <ThemedText type="body" themeColor="textSecondary">Deux actions liées à ton trajet domicile-travail.</ThemedText>
      <ThemedText type="small" themeColor="textTertiary">par an · 7 % de ton empreinte</ThemedText>
      <ThemedText type="code" themeColor="textTertiary">source ADEME · valeurs à confirmer</ThemedText>
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <Button title="Continuer" />
      <Button title="Revoir mon plan" variant="secondary" />
      <Button title="Créer mon compte" disabled />
      <div style={{display:'flex',gap:16}}><Button title="Retour" variant="secondary" style={{width:'auto'}} /><Button title="Suivant" flex /></div>
      <TextLink label="Modifier mes réponses" type="small" themeColor="textTertiary" align="center" />
      <TextLink label="Utiliser un email à la place" type="linkPrimary" align="center" />
      <MessageInline message="Le mot de passe doit contenir au moins 8 caractères." />
      <OnboardingDots total={4} activeIndex={1} />
    </div>
  </div>
);
