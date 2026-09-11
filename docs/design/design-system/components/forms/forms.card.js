// Démonstration de la carte — exécutée par components/loader.js (RamilleRun) ; le namespace Ramille est en portée.
const { Chip, ChoiceRow, ModeListItem, PrecisionMode, NumericField, TextField, GoogleButton } = NS;
ReactDOM.createRoot(document.getElementById('root')).render(
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'flex',gap:6}}>{['L','M','M','J','V','S','D'].map((d,i)=><Chip key={i} label={d} selected={i===1||i===3} flex radius={14} />)}</div>
      <div style={{display:'flex',gap:8}}><Chip label="Oui" selected selectedStyle="outline" /><Chip label="Non" selected={false} /><Chip label="< 5 km" selected={false} /><Chip label="5–15" selected /></div>
      <ChoiceRow label="Oui" selected />
      <ChoiceRow label="Non" selected={false} />
      <ChoiceRow label="Notification" detail="Sur ce téléphone, le lundi matin." selected />
      <ChoiceRow label="Rien" detail="Je reviens ici quand je veux." selected={false} />
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <ModeListItem label="Voiture (seul)" selected />
      <PrecisionMode question="Quelle motorisation ?" options={[{value:'t',label:'Thermique'},{value:'h',label:'Hybride'}]} valeur="t" />
      <ModeListItem label="Vélo" selected={false} />
      <NumericField value={12} unit="km" label="Distance d’un aller" />
      <TextField label="Email" value="camille@exemple" type="email" placeholder="camille@exemple.fr" helperText="Cette adresse semble incomplète." />
      <GoogleButton />
    </div>
  </div>
);
