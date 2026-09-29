// Démonstration de la carte — exécutée par components/loader.js (RamilleRun) ; le namespace Ramille est en portée.
//
// Les quatre entrées de section du questionnaire, chacune dans sa coquille (`StepShell`) à la largeur d'un
// téléphone, avec le mot de Ramille que la table `RAMILLE.entreeDeSection` (src/constants/mascotte.ts) lui
// donne — les cinq autres étapes n'en ont pas. Chacune part de l'état vierge du produit (`EMPTY_BILAN_ANSWERS`), et
// le total d'étapes suit les réponses comme dans le produit : « Non » au trajet régulier en retire trois,
// « Rarement » une. Tant que l'étape est incomplète, « Suivant » est en attente — gris, mais il agit : rien ne dit ce
// qui manque avant qu'on le touche ; au toucher, « Il manque encore … » apparaît au-dessus des boutons, le focus va à
// la question et, sur une question secondaire (la part de vols courts, une question du contexte), l'intitulé passe en
// `accentText`. La demande retombe dès que l'étape est complète. Puis la feuille du re-bilan, qui ne s'ouvre qu'à la
// soumission quand une action est engagée.

const { StepShell, CommuteHasTripStep, LeisureFrequencyStep, FlightsStep, ContextStep, FeuilleNouveauBilan } = NS;
const cadre = { border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', height: 820, display: 'flex' };

const REPONSES = {
  commute_has_regular_trip: null,
  commute_days_per_week: 5,
  leisure_frequency: null,
  flights_total_per_year: 0,
  flights_short_per_year: null,
  zone_type: null,
  tc_access: null,
  household_vehicles: null,
  teletravail: null,
};

// `teletravailSePose`, `manqueDeLEtape` et le compte de `visibleSteps` (src/types/bilan.ts), recopiés pour les
// quatre étapes montrées : ce qui manque est un champ, pour y mener, et une phrase, pour le dire.
const teletravailSePose = (a) => a.commute_has_regular_trip !== false && a.commute_days_per_week !== null && a.commute_days_per_week >= 2;
const nombreDEtapes = (a) => 9 - (a.commute_has_regular_trip === false ? 3 : 0) - (a.leisure_frequency === 'rarely' ? 1 : 0);
const manque = (champ, phrase) => ({ champ, phrase });
const MANQUE = {
  commute_has_trip: (a) => (a.commute_has_regular_trip === null ? manque('commute_has_regular_trip', 'une réponse') : null),
  leisure_frequency: (a) => (a.leisure_frequency === null ? manque('leisure_frequency', 'ta fréquence') : null),
  flights: (a) =>
    a.flights_total_per_year > 0 && a.flights_short_per_year === null ? manque('flights_short_per_year', 'la part de vols courts') : null,
  context: (a) =>
    a.zone_type === null ? manque('zone_type', 'ton type de zone')
    : a.tc_access === null ? manque('tc_access', 'l’accès aux transports en commun')
    : a.household_vehicles === null ? manque('household_vehicles', 'le nombre de véhicules du foyer')
    : teletravailSePose(a) && a.teletravail === null ? manque('teletravail', 'ta réponse sur le télétravail')
    : null,
};

function Etape({ etape, section, step, mot, depart, rendre }) {
  const [answers, setAnswers] = React.useState({ ...REPONSES, ...depart });
  // Une par réponse donnée, comme l'écran du questionnaire : c'est ce qui autorise une précision qui s'ouvre à faire
  // défiler l'écran.
  const [reponsesDonnees, setReponsesDonnees] = React.useState(0);
  const update = (patch) => {
    setReponsesDonnees((n) => n + 1);
    setAnswers((a) => ({ ...a, ...patch }));
  };
  return (
    <div style={cadre}>
      <StepShell section={section} step={step} total={nombreDEtapes(answers)} motDeRamille={mot}
        entree={{ cle: etape, sens: null }} reponsesDonnees={reponsesDonnees}
        onBack={step > 1 ? () => {} : undefined} onNext={() => {}}
        nextLabel={step === 9 ? 'Voir mon bilan' : 'Suivant'} manque={MANQUE[etape](answers)}>
        {rendre(answers, update)}
      </StepShell>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <div style={{display:'flex',flexDirection:'column',gap:24}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4, 390px)',gap:16}}>
      <Etape etape="commute_has_trip" section="Domicile-travail" step={1}
        mot="À peu près, c’est déjà bien. Je ne vérifie rien, et personne ne relit."
        rendre={(a, u) => <CommuteHasTripStep answers={a} update={u} />} />
      <Etape etape="leisure_frequency" section="Loisirs du week-end" step={5} depart={{ commute_has_regular_trip: true }}
        mot="Pense à une semaine ordinaire, pas à la meilleure ni à la pire."
        rendre={(a, u) => <LeisureFrequencyStep answers={a} update={u} total={nombreDEtapes(a)} />} />
      <Etape etape="flights" section="Voyages longue distance" step={7} depart={{ commute_has_regular_trip: true }}
        mot="De mémoire, sans aller chercher. C’est l’ordre de grandeur qui compte."
        rendre={(a, u) => <FlightsStep answers={a} update={u} />} />
      <Etape etape="context" section="Contexte de mobilité" step={9} depart={{ commute_has_regular_trip: true, leisure_frequency: 'weekly' }}
        mot="Ce qui est possible là où tu vis change ce que je te proposerai ensuite."
        rendre={(a, u) => <ContextStep answers={a} update={u} />} />
    </div>
    <div style={{maxWidth:420}}>
      <FeuilleNouveauBilan engagement={{action:'Faire un trajet sur cinq à vélo',intention:'le mardi et le jeudi'}} style={{borderRadius:12,overflow:'hidden'}} />
    </div>
  </div>
);
