// Kit d'écrans Ramille — recomposé avec les composants du design system. Valeurs relevées du dépôt (src/app/*).
const { useState } = React;
const Phone = ({ children, dark }) => (
  <div data-theme={dark ? 'dark' : undefined} style={{ width: 390, height: 844, borderRadius: 40, overflow: 'hidden', background: 'var(--color-background)', boxShadow: '0 24px 60px rgba(19,22,18,0.10)', display: 'flex', flexDirection: 'column', color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>
    <div style={{ height: 44, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 24px 6px', fontSize: 13, fontWeight: 600, flexShrink: 0 }}><span>9:41</span><span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><span style={{ width: 16, height: 9, borderRadius: 2, background: 'var(--color-text)' }} /><span style={{ width: 22, height: 11, border: '1.5px solid var(--color-text)', borderRadius: 3 }} /></span></div>
    {children}
  </div>
);
const Scroll = ({ children, gap = 24 }) => <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap }}>{children}</div>;
const Foot = ({ children }) => <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>{children}</div>;
// Source : `CompareRow` (src/app/(tabs)/suivi/bilan.tsx). La ligne qui est à la personne (« Toi ») est en gras et en
// `text` ; les repères (le palier, la moyenne) sont en `textSecondary`, poids normal, et en remplissage `accentMuted`.
// Les valeurs sont en chiffres tabulaires, comme dans le dépôt.
const Bar = ({ label, value, pct, bold, muted }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <ThemedText type="small" weight={bold ? 600 : 400} themeColor={bold ? 'text' : 'textSecondary'}>{label}</ThemedText>
      <ThemedText type="small" weight={bold ? 600 : 400} themeColor={bold ? 'text' : 'textSecondary'} style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</ThemedText>
    </div>
    <div style={{ height: 14, borderRadius: 7, background: 'var(--color-border)' }}><div style={{ width: pct + '%', height: '100%', borderRadius: 7, background: muted ? 'var(--color-accent-muted)' : 'var(--color-accent)' }} /></div>
  </div>
);

function Onboarding({ go }) {
  return (
    <Phone>
      <Scroll>
        <div style={{ flex: 1, minHeight: 220, borderRadius: 24, background: 'repeating-linear-gradient(135deg, var(--color-background-selected) 0 10px, var(--color-background-tinted) 10px 20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}><ThemedText type="code" themeColor="textTertiary">illustration — une personne et ses trajets du quotidien</ThemedText></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ThemedText as="h1" weight={600} style={{ fontSize: 34, lineHeight: '40px', letterSpacing: '-0.68px', textWrap: 'balance' }}>Comprendre tes trajets, sans te juger.</ThemedText>
          <ThemedText themeColor="textTertiary" weight={400}>En quelques minutes, tu vois quel déplacement pèse le plus dans ton empreinte — et ce que tu peux faire de concret.</ThemedText>
        </div>
      </Scroll>
      <Foot><Button title="Découvrir mon impact" onPress={() => go('bilan')} /><OnboardingDots total={4} activeIndex={0} /></Foot>
    </Phone>
  );
}

// La branche « commute_mode » de `manqueDeLEtape` (src/types/bilan.ts), phrases comprises.
function manqueDuMode(a) {
  if (a.commute_mode === null) return { champ: 'commute_mode', phrase: 'ton mode de transport' };
  if (a.commute_mode === 'voiture' && a.commute_car_engine === null) return { champ: 'commute_car_engine', phrase: 'la motorisation' };
  if (a.commute_mode === 'deux_roues_motorise' && a.commute_two_wheeler_type === null) return { champ: 'commute_two_wheeler_type', phrase: 'le type de deux-roues' };
  if (a.commute_mode === 'train' && a.commute_train_type === null) return { champ: 'commute_train_type', phrase: 'le type de train' };
  if (a.commute_mode === 'velo' && a.commute_velo_type === null) return { champ: 'commute_velo_type', phrase: 'le type de vélo' };
  if (a.commute_is_carpool && a.commute_carpool_size === null) return { champ: 'commute_carpool_size', phrase: 'le nombre de personnes dans la voiture' };
  return null;
}

function Bilan({ go }) {
  const [answers, setAnswers] = useState({
    commute_mode: null, commute_is_carpool: false, commute_carpool_size: null, commute_car_engine: null,
    commute_two_wheeler_type: null, commute_train_type: null, commute_velo_type: null,
  });
  const [reponses, setReponses] = useState(0);
  // Changer de mode efface ce qu'il rend impossible, comme `normaliserReponses` (ici, en plus court).
  const update = (patch) => {
    setReponses((n) => n + 1);
    setAnswers((a) => {
      const b = { ...a, ...patch };
      if ('commute_mode' in patch || 'commute_is_carpool' in patch) {
        if (b.commute_mode !== 'voiture') b.commute_car_engine = null;
        if (!b.commute_is_carpool) b.commute_carpool_size = null;
        if (b.commute_mode !== 'deux_roues_motorise') b.commute_two_wheeler_type = null;
        if (b.commute_mode !== 'train') b.commute_train_type = null;
        if (b.commute_mode !== 'velo') b.commute_velo_type = null;
      }
      return b;
    });
  };
  return (
    <Phone>
      <StepShell section="Domicile-travail" step={3} total={9} onBack={() => go('onboarding')} onNext={() => go('restitution')} manque={manqueDuMode(answers)} entree={{ cle: 'commute_mode', sens: null }} reponsesDonnees={reponses}>
        <CommuteModeStep answers={answers} update={update} />
      </StepShell>
    </Phone>
  );
}

// Source : src/app/(tabs)/suivi/bilan.tsx, en mode « nouveau » (la sortie du questionnaire) — recomposée le 01/10/2026
// sur l'écran réel (audit R-12 de `v1-33`). L'ordre est celui des décisions D9 et D11 : la carte dominante, **le total
// juste dessous** avec sa méthode et la contestation (« Un chiffre me semble faux », « Ce bilan ne me ressemble pas »),
// puis la répartition, « Où tu te situes » et sa phrase du cap ; la fin de page ne garde que le partage et le nouveau
// bilan, et le pied porte le seul pas suivant. « Modifier mes réponses » n'existe plus (`v1-19` D1).
//
// Les chiffres sont ceux que le kit portait (3,4 t, 2,1 t pour 62 %, 2,8 t), cohérents entre eux ; ce qui manquait pour
// qu'ils se somment et pour dire le cap en est tiré : 2,1 t + 380 kg + 920 kg = 3,4 t, un cap de 420 kg (20 % du poste
// dominant) donc un palier à 3,0 t. **Pas de barre « Repère 2050 »**
// au-dessus de la moyenne : 3,4 t est au-dessus, et le repère n'y est qu'un gouffre (`showsTarget2050`, D10 laisse la
// barre en relecture seulement). Le palier est en `accentMuted` comme les repères : seul « Toi » porte l'accent.
// Aucune bannière de compte ici : elle ne se rend qu'à une session anonyme, et ce kit ne porte pas l'état de la session.
function Restitution({ go }) {
  return (
    <Phone>
      <BandeHaute onCompte={() => go('toi')} />
      <Scroll>
        <ThemedText type="small" themeColor="textTertiary">Ton bilan transport</ThemedText>
        <div style={{ background: 'var(--color-background-selected)', borderRadius: 24, padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ThemedText type="small" weight={600} themeColor="accentText">Le déplacement qui pèse le plus</ThemedText>
          <ThemedText type="display">Ton trajet domicile-travail en voiture thermique</ThemedText>
          <ThemedText themeColor="textSecondary" style={{ fontSize: 16, lineHeight: '24px' }}>2,1 t CO₂e par an, soit 62 % de ton empreinte transport.</ThemedText>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <ThemedText type="small" themeColor="textTertiary">Estimation annuelle, tous déplacements</ThemedText>
          <ThemedText type="salient" style={{ fontVariantNumeric: 'tabular-nums' }}>3,4 t CO₂e</ThemedText>
          <BlocMethode />
          <TextLink label="Un chiffre me semble faux" apparence="discret" role="link" containerStyle={{ alignItems: 'flex-start' }} />
          <TextLink label="Ce bilan ne me ressemble pas" apparence="discret" containerStyle={{ alignItems: 'flex-start' }} />
        </div>
        <div style={{ background: 'var(--color-background-element)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ThemedText type="small" weight={600}>Répartition par poste</ThemedText>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Bar label="Trajet domicile-travail" value="2,1 t CO₂e" pct={62} bold />
            <Bar label="Loisirs du week-end" value="380 kg CO₂e" pct={11} muted />
            <Bar label="Voyages longue distance" value="920 kg CO₂e" pct={27} muted />
          </div>
        </div>
        <div style={{ background: 'var(--color-background-element)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ThemedText type="small" weight={600}>Où tu te situes</ThemedText>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Bar label="Toi" value="3,4 t" pct={85} bold />
            <Bar label="Ton prochain palier" value="3,0 t" pct={75} muted />
            <Bar label="Moyenne en France" value="2,8 t" pct={70} muted />
          </div>
          <ThemedText type="small" themeColor="textSecondary">Ton cap pour cette saison : 420 kg CO₂e de moins sur l’année sur ton trajet domicile-travail. Le plan qui suit propose de quoi le franchir ; 2050 se joue palier après palier.</ThemedText>
          <ThemedText type="code" themeColor="textTertiary">SDES, données 2017 · cible 2050 : ADEME</ThemedText>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          <TextLink label="Partager mon bilan" apparence="action" align="center" />
          <TextLink label="Faire un nouveau bilan" apparence="discret" role="link" align="center" onPress={() => go('bilan')} />
        </div>
      </Scroll>
      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}><Button title="Voir ce que je peux faire" onPress={() => go('plan')} /></div>
    </Phone>
  );
}

function Plan({ go, dark }) {
  const [answered, setAnswered] = useState(null);
  const [state, setState] = useState('committed');
  const [days, setDays] = useState([2, 4]);
  return (
    <Phone dark={dark}>
      <BandeHaute onCompte={() => go('toi')} />
      <Scroll gap={16}>
        <CheckinCard periodLabel="Semaine du 14/09" question="Mardi ou jeudi, as-tu fait ce trajet à vélo ?" answered={answered} onAnswer={setAnswered} />
        <ThemedText type="screenTitle" as="h1">Ton plan</ThemedText>
        <ActionCard titre="Faire un trajet sur cinq à vélo" gainKg={184} partPercent={7} intention="le mardi et le jeudi" engagee={state === 'committed'}>
          <ActionCommitment kind="days" state={state} days={days} onPick={() => setState('picking')} onToggleDay={(i) => setDays((d) => d.includes(i) ? d.filter((x) => x !== i) : [...d, i])} onCancel={() => setState('idle')} onSubmit={() => setState('committed')} onRelease={() => setState('idle')} />
        </ActionCard>
        <ActionCard titre="Travailler depuis chez toi un jour par semaine" gainKg={240} partPercent={9} estompee={state === 'committed'}>
          <ActionCommitment state="idle" otherActionCommitted={state === 'committed'} />
        </ActionCard>
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ThemedText type="small" weight={600} themeColor="accentText">Ton cap pour cette saison</ThemedText>
          <ThemedText type="salient">− 184 kg</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">par an, soit − 20 % sur ton trajet domicile-travail</ThemedText>
        </div>
      </Scroll>
      <BarreOnglets actif="plan" onChange={(t) => go(t)} />
    </Phone>
  );
}

function Suivi({ go, dark }) {
  return (
    <Phone dark={dark}>
      <BandeHaute onCompte={() => go('toi')} />
      <Scroll gap={20}>
        <ThemedText type="screenTitle" as="h1">Ton suivi</ThemedText>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[['10 sept. 2026', '3,4 t', null], ['12 mars 2026', '3,7 t', '− 8 %']].map(([d, t, e]) => (
            <div key={d} style={{ background: 'var(--color-background-element)', borderRadius: 18, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><ThemedText type="small" themeColor="textTertiary">{d}</ThemedText><ThemedText type="cardTitle">{t} CO₂e</ThemedText></div>
              {e && <ThemedText type="small" weight={600} themeColor="accentText">{e}</ThemedText>}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ThemedText type="cardTitle">6 points de suivi</ThemedText>
          {[['1 sept.', 'Oui'], ['25 août', 'Oui'], ['18 août', 'Non'], ['11 août', 'Oui']].map(([d, r]) => (
            <div key={d} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}><ThemedText type="body" themeColor="textSecondary">{d}</ThemedText><ThemedText type="body" weight={600}>{r}</ThemedText></div>
          ))}
          <ThemedText type="small" themeColor="textSecondary">Tu réponds régulièrement : c’est déjà ça qui compte.</ThemedText>
        </div>
        <Button title="Faire un nouveau bilan" variant="secondary" onPress={() => go('bilan')} />
      </Scroll>
      <BarreOnglets actif="suivi" onChange={(t) => go(t)} />
    </Phone>
  );
}

function Toi({ go, dark }) {
  const [canal, setCanal] = useState('push');
  return (
    <Phone dark={dark}>
      {/* L'ordre et l'écart de l'écran (`v1-33` T-15) : le compte, puis les rappels, puis « Mes données »,
          32 entre sections. */}
      <Scroll gap={32}>
        <TextLink label="← Retour" apparence="discret" onPress={() => go('plan')} />
        <ThemedText type="screenTitle" as="h1">Toi</ThemedText>
        <div style={{ background: 'var(--color-background-element)', borderRadius: 18, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ThemedText type="small" weight={600}>Ton compte</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Aucun compte : ton bilan vit sur cet appareil. Un compte sert à le retrouver ailleurs.</ThemedText>
          <GoogleButton />
          <TextLink label="Utiliser un email à la place" apparence="action" align="center" />
        </div>
        <ChoixDeRappel canal={canal} onChoisir={setCanal} />
        <MonCompte />
      </Scroll>
    </Phone>
  );
}

const SCREENS = { onboarding: Onboarding, bilan: Bilan, restitution: Restitution, plan: Plan, suivi: Suivi, toi: Toi };
const LABELS = { onboarding: 'Onboarding', bilan: 'Bilan (B1.4)', restitution: 'Restitution', plan: 'Plan', suivi: 'Suivi', toi: 'Toi' };
function Kit() {
  const [screen, setScreen] = useState('plan');
  const [dark, setDark] = useState(false);
  const S = SCREENS[screen];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {Object.keys(SCREENS).map((k) => <Chip key={k} label={LABELS[k]} selected={screen === k} selectedStyle="outline" onPress={() => setScreen(k)} />)}
        <Chip label="Thème sombre" selected={dark} onPress={() => setDark(!dark)} radius={22} />
      </div>
      <S go={setScreen} dark={dark} />
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<Kit />);
