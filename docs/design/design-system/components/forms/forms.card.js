// Démonstration de la carte — exécutée par components/loader.js (RamilleRun) ; le namespace Ramille est en portée.
const { Chip, ChoiceRow, ModeListItem, PrecisionMode, NumericField, TextField, GoogleButton, ThemedText } = NS;
const JOURS = [['L','lundi'],['M','mardi'],['M','mercredi'],['J','jeudi'],['V','vendredi'],['S','samedi'],['D','dimanche']];
ReactDOM.createRoot(document.getElementById('root')).render(
  <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:24}}>
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {/* Les jours de l'engagement : des `checkbox` en grille de quatre colonnes au plus, dans un encart teinté. */}
      <div style={{background:'var(--color-background-element)',borderRadius:16,padding:16,display:'flex',flexDirection:'column',gap:8}}>
        <ThemedText type="small" themeColor="textTertiary">Quels jours ?</ThemedText>
        <div role="group" aria-label="Quels jours ?" style={{display:'flex',flexWrap:'wrap',rowGap:8,margin:'0 -4px'}}>
          {JOURS.map(([c, l], i) => <div key={i} style={{width:'25%',minWidth:56,padding:'0 4px',display:'flex',flexDirection:'column'}}><Chip label={c} accessibilityLabel={l} role="checkbox" selected={i===1||i===3} radius={14} nestedBackground /></div>)}
        </div>
      </div>
      <div role="radiogroup" aria-label="Utilises-tu un second mode en complément ?" style={{display:'flex',gap:8}}><Chip label="Oui" role="radio" selected selectedStyle="outline" flex radius={16} /><Chip label="Non" role="radio" selected={false} selectedStyle="outline" flex radius={16} /></div>
      <div role="radiogroup" aria-label="Quelle distance aller, en général ?" style={{display:'flex',flexWrap:'wrap',gap:8}}><Chip label="Moins de 5 km" role="radio" selected={false} /><Chip label="5 à 15 km" role="radio" selected /></div>
      <TextField label="Email" value="camille@exemple" keyboardType="email-address" placeholder="camille@exemple.fr" helperText="Cette adresse semble incomplète." />
      <TextField label="Email" value="" keyboardType="email-address" placeholder="camille@exemple.fr" />
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div role="radiogroup" aria-label="Environ, ça représente quelle distance ?" style={{display:'flex',flexDirection:'column',gap:8}}>
        <ChoiceRow label="Moins de 5 km" selected={false} />
        <ChoiceRow label="5 à 15 km" selected />
      </div>
      <ModeListItem label="Voiture (seul)" selected />
      <PrecisionMode question="Quelle motorisation ?" options={[{value:'t',label:'Thermique'},{value:'h',label:'Hybride'}]} valeur="t" />
      <NumericField value={12} unit="km" label="Distance d’un aller" />
      <NumericField value={null} unit="km" label="Distance d’un aller" />
      <GoogleButton />
    </div>
  </div>
);
