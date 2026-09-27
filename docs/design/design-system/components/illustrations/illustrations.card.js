// Démonstration de la carte — exécutée par components/loader.js (RamilleRun) ; le namespace Ramille est en portée.

const { OnboardingHeroIllustration, ReassuranceIllustration, EmptyStateIllustration } = NS;
ReactDOM.createRoot(document.getElementById('root')).render(
  <div style={{display:'grid',gridTemplateColumns:'repeat(3, minmax(0,1fr))',gap:16,alignItems:'start'}}>
    <OnboardingHeroIllustration style={{height:240}} />
    <div style={{background:'var(--color-background-tinted)',padding:12,borderRadius:24}}><ReassuranceIllustration style={{height:180}} /></div>
    <EmptyStateIllustration style={{height:160}} />
  </div>
);
