// Démonstration de la carte — exécutée par components/loader.js (RamilleRun) ; le namespace Ramille est en portée.
const { Chip, ChoiceRow, ModeListItem, PrecisionMode, NumericField, TextField, GoogleButton, ThemedText, GroupeDeChoix, LigneDeCanal } = NS;
const JOURS = [[1,'L','lundi'],[2,'M','mardi'],[3,'M','mercredi'],[4,'J','jeudi'],[5,'V','vendredi'],[6,'S','samedi'],[7,'D','dimanche']];
ReactDOM.createRoot(document.getElementById('root')).render(
  <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:24}}>
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {/* Les jours de l'engagement : des `checkbox` en grille de quatre colonnes au plus, dans un encart teinté. */}
      <div style={{background:'var(--color-background-element)',borderRadius:16,padding:16,display:'flex',flexDirection:'column',gap:8}}>
        <ThemedText type="small" themeColor="textTertiary">Quels jours ?</ThemedText>
        <GroupeDeChoix question="Quels jours ?" cumulable colonnes={4}>
          {JOURS.map(([v, c, l]) => <Chip key={v} label={c} accessibilityLabel={l} role="checkbox" selected={v===2||v===4} radius={14} nestedBackground />)}
        </GroupeDeChoix>
      </div>
      <GroupeDeChoix question="Utilises-tu un second mode en complément ?" style={{flexDirection:'row',gap:8}}><Chip label="Oui" role="radio" selected selectedStyle="outline" flex radius={16} /><Chip label="Non" role="radio" selected={false} selectedStyle="outline" flex radius={16} /></GroupeDeChoix>
      <GroupeDeChoix question="Quelle distance aller, en général ?" style={{flexDirection:'row',flexWrap:'wrap',gap:8}}><Chip label="Moins de 5 km" role="radio" selected={false} /><Chip label="5 à 15 km" role="radio" selected /></GroupeDeChoix>
      <TextField label="Email" value="camille@exemple" keyboardType="email-address" placeholder="camille@exemple.fr" helperText="Cette adresse semble incomplète." />
      <TextField label="Email" value="" keyboardType="email-address" placeholder="camille@exemple.fr" />
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <GroupeDeChoix question="Environ, ça représente quelle distance ?" style={{gap:8}}>
        <ChoiceRow label="Moins de 5 km" selected={false} />
        <ChoiceRow label="5 à 15 km" selected />
      </GroupeDeChoix>
      {/* La précision est son propre groupe, posé DANS celui du mode : chaque option répond au groupe le plus proche. */}
      <GroupeDeChoix question="Quel est ton mode de transport principal pour ce trajet ?" style={{gap:8}}>
        <ModeListItem label="Voiture (seul)" selected />
        <PrecisionMode question="Quelle motorisation ?" options={[{value:'thermique',label:'Thermique'},{value:'hybride',label:'Hybride'}]} valeur="thermique" />
        <ModeListItem label="Bus" selected={false} />
      </GroupeDeChoix>
      <GroupeDeChoix question="Comment tu préfères que je te fasse signe ?" style={{gap:8}}>
        <LigneDeCanal ligne={{canal:'push',titre:'Par notification sur ce téléphone',detail:'À activer en une fois.',choisi:true}} />
        <LigneDeCanal ligne={{canal:'email',titre:'Par email',detail:'Rattache un compte pour l’activer.',choisissable:false}} />
      </GroupeDeChoix>
      <NumericField value={12} unit="km" label="Distance d’un aller" />
      <NumericField value={null} unit="km" label="Distance d’un aller" />
      <GoogleButton />
    </div>
  </div>
);
