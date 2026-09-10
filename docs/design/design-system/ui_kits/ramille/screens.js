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
const Bar = ({ label, value, pct, muted }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}><ThemedText type="small" themeColor="textSecondary">{label}</ThemedText><ThemedText type="small" weight={600}>{value}</ThemedText></div>
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

function Bilan({ go }) {
  const [mode, setMode] = useState('voiture');
  const [moto, setMoto] = useState(null);
  const modes = [['voiture', 'Voiture (seul)'], ['covoit', 'Voiture (covoiturage)'], ['bus', 'Bus'], ['train', 'Train ou RER'], ['metro', 'Métro ou tram'], ['velo', 'Vélo'], ['marche', 'Marche'], ['deux', 'Deux-roues motorisé'], ['trott', 'Trottinette ou mobilité douce']];
  const needMoto = mode === 'voiture' || mode === 'covoit';
  return (
    <Phone>
      <StepShell section="Domicile-travail" step={3} total={9} onBack={() => go('onboarding')} onNext={() => go('restitution')} nextDisabled={needMoto && !moto} manque={needMoto && !moto ? 'la motorisation' : null}>
        <ThemedText type="screenTitle" as="h1">Quel est ton mode de transport principal ?</ThemedText>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {modes.map(([v, l]) => (
            <React.Fragment key={v}>
              <ModeListItem label={l} selected={mode === v} onPress={() => { setMode(v); setMoto(null); }} />
              {mode === v && needMoto && <PrecisionMode question="Quelle motorisation ?" options={[{ value: 't', label: 'Thermique' }, { value: 'h', label: 'Hybride' }, { value: 'hr', label: 'Hybride rechargeable' }, { value: 'e', label: 'Électrique' }]} valeur={moto} onChange={setMoto} />}
            </React.Fragment>
          ))}
        </div>
        <ThemedText type="code" themeColor="textTertiary" style={{ textAlign: 'center' }}>Ton mode n’est pas dans la liste ? Dis-le-nous.</ThemedText>
      </StepShell>
    </Phone>
  );
}

function Restitution({ go }) {
  return (
    <Phone>
      <Scroll>
        <ThemedText type="small" themeColor="textTertiary">Ton bilan transport</ThemedText>
        <div style={{ background: 'var(--color-background-selected)', borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ThemedText type="small" weight={600} themeColor="accentText">Le déplacement qui pèse le plus</ThemedText>
          <ThemedText as="h1" weight={600} style={{ fontSize: 32, lineHeight: '38px', letterSpacing: '-0.64px' }}>Ton trajet domicile-travail, en voiture</ThemedText>
          <ThemedText type="body" themeColor="textSecondary">2,1 t CO₂e par an · 62 % de ton empreinte transport</ThemedText>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <ThemedText type="small" themeColor="textTertiary">Total annuel</ThemedText>
          <ThemedText weight={600} style={{ fontSize: 26, lineHeight: '32px' }}>3,4 t CO₂e</ThemedText>
        </div>
        <div style={{ background: 'var(--color-background-element)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ThemedText type="cardTitle">Où tu te situes</ThemedText>
          <Bar label="Toi" value="3,4 t" pct={100} />
          <Bar label="Moyenne en France" value="2,8 t" pct={82} muted />
          <Bar label="Repère 2050" value="0,6 t" pct={18} muted />
          <ThemedText type="body" themeColor="textSecondary">0,6 t au-dessus de la moyenne en France.</ThemedText>
          <ThemedText type="code" themeColor="textTertiary">source SDES 2,8 t · repère dérivé ADEME</ThemedText>
        </div>
      </Scroll>
      <Foot><Button title="Voir ce que je peux faire" onPress={() => go('plan')} /><TextLink label="Modifier mes réponses" type="small" themeColor="textTertiary" align="center" onPress={() => go('bilan')} /></Foot>
    </Phone>
  );
}

function Plan({ go, dark }) {
  const [answered, setAnswered] = useState(null);
  const [state, setState] = useState('committed');
  const [days, setDays] = useState([1, 3]);
  return (
    <Phone dark={dark}>
      <BandeHaute onCompte={() => go('toi')} />
      <Scroll gap={16}>
        <CheckinCard periodLabel="Point de la semaine · 8 sept." question="As-tu changé de mode de transport au moins une fois cette semaine pour ton trajet domicile-travail ?" answered={answered} onAnswer={setAnswered} />
        <ThemedText type="screenTitle" as="h1">Ton plan</ThemedText>
        <ActionCard titre="Faire ce trajet à vélo" gainKg={184} partPercent={7} intention="le mardi et le jeudi" engagee={state === 'committed'}>
          <ActionCommitment kind="days" state={state} days={days} onPick={() => setState('picking')} onToggleDay={(i) => setDays((d) => d.includes(i) ? d.filter((x) => x !== i) : [...d, i])} onCancel={() => setState('idle')} onSubmit={() => setState('committed')} onRelease={() => setState('idle')} />
        </ActionCard>
        <ActionCard titre="Travailler depuis chez toi un jour par semaine" gainKg={240} partPercent={9} estompee={state === 'committed'}>
          <ActionCommitment state="idle" otherActionCommitted={state === 'committed'} />
        </ActionCard>
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ThemedText type="small" themeColor="textTertiary">Ton cap pour cette période</ThemedText>
          <ThemedText type="salient">− 184 kg</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Cadence : Automne 2026</ThemedText>
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
        <Button title="Refaire mon bilan" variant="secondary" onPress={() => go('bilan')} />
      </Scroll>
      <BarreOnglets actif="suivi" onChange={(t) => go(t)} />
    </Phone>
  );
}

function Toi({ go, dark }) {
  const [canal, setCanal] = useState('push');
  return (
    <Phone dark={dark}>
      <Scroll gap={24}>
        <TextLink label="← Retour" type="small" themeColor="textTertiary" onPress={() => go('plan')} />
        <ThemedText type="screenTitle" as="h1">Toi</ThemedText>
        <ChoixDeRappel canal={canal} onChoisir={setCanal} />
        <div style={{ background: 'var(--color-background-element)', borderRadius: 18, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ThemedText type="small" weight={600}>Ton compte</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Aucun compte : ton bilan vit sur cet appareil. Un compte sert à le retrouver ailleurs.</ThemedText>
          <GoogleButton />
          <TextLink label="Utiliser un email à la place" type="linkPrimary" align="center" />
        </div>
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
