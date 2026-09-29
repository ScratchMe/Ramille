import React from 'react';
import { ProgressHeader } from './ProgressHeader.jsx';
import { Button } from '../core/Button.jsx';
import { MessageInline } from '../core/MessageInline.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { contexteDesAncres } from '../forms/IntituleDuChamp.jsx';
// Source : src/components/bilan/step-shell.tsx — en-tête (padding 8/24/0, gap 16), contenu défilant (padding 24,
// gap 32), pied collant (padding 24, gap 8) : Retour (secondaire, largeur auto) et Suivant (flex), à 16 l'un de l'autre.
//
// Quand l'étape change (`entree.cle`), le contenu revient en haut et entre du côté d'où l'on vient (8 px, 250 ms) ; le
// focus va au contenu, pour que la question soit annoncée — seulement après un passage d'une étape à l'autre
// (`entree.sens`), jamais au montage ni à la reprise d'un brouillon.
//
// **Ce qui manque se dit au toucher, jamais d'office** (29/09/2026, `v1-31`). Rien ne s'écrit à l'arrivée — la question
// est déjà en titre —, rien ne change sous le doigt pendant qu'on répond. Sur une étape incomplète, « Suivant » est en
// attente (`Button enAttente` : l'apparence du désactivé, mais il agit). Le toucher, ou celui de la ligne qu'il fait
// apparaître, **mène** à ce qui manque, dans cet ordre : le focus s'y pose (l'option cochée du groupe, ou sa première ;
// le champ de saisie lui-même), puis l'écran y défile le minimum pour qu'il soit entier, 16 au-dessus du pied. Tant
// que l'étape reste incomplète, « Il manque encore … » se tient au-dessus des boutons (lien small 600 `accentText`,
// cible 48, fondu 200 ms, jamais une alerte) et l'intitulé du champ passe en `accentText` 600 — jamais le titre de
// l'étape. La demande retombe à la complétude et en quittant l'étape ; un nouveau manque ne se dit qu'au toucher suivant.
//
// **Le filet du pied** : le trait de la bande haute (`border`, un cheveu, pleine largeur, en position absolue), quand le
// contenu continue sous le pied au-delà de sa marge basse de 24. Il dit qu'il y a une suite, pas ce qui manque.
//
// **À l'ouverture d'une précision** (`BoiteDePrecision`) qui suit une réponse, l'écran remonte juste assez pour qu'elle
// finisse 16 au-dessus du pied, sans jamais faire passer le choix au-dessus du bord (8). Le dépôt suit aussi
// « Lequel ? » et la distance d'une sortie (`Depliage` suivi) ; le kit ne suit que la boîte.
//
// Le défilement est celui de la plateforme, posé sous « réduire les animations » ; les animations aussi.

// `Mouvement` (src/constants/theme.ts), recopié.
const COURBE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const ENTREE_MS = 250;
const FONDU_MS = 200;
const DEPLACEMENT = 8;
const animationsReduites = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// `QUESTION_PRINCIPALE` et `seMarque` (src/types/bilan.ts), recopiées : la question que pose le titre de chaque étape
// ne se marque jamais. Le dépôt exige en plus que le champ soit de la table de l'étape (`CHAMPS_DE_L_ETAPE`), qu'un
// test ferme ; les étapes du kit n'enregistrent que les leurs.
const QUESTION_PRINCIPALE = {
  commute_has_trip: 'commute_has_regular_trip',
  commute_days_distance: 'commute_days_per_week',
  commute_mode: 'commute_mode',
  commute_extra: 'commute_second_mode_used',
  leisure_frequency: 'leisure_frequency',
  leisure_detail: 'leisure_mode',
  flights: 'flights_total_per_year',
  long_trips: null,
  context: null,
};
const seMarque = (etape, champ) => champ !== QUESTION_PRINCIPALE[etape];

// `decalagePourMontrer` et `suiteSousLePied` (src/types/demande.ts), `defilementPourMontrer` (src/types/mouvement.ts),
// recopiées. Positions en coordonnées du contenu qui défile (0 en haut, marge comprise).
const MARGE_AU_DESSUS_DU_PIED = 16;
const MARGE_SOUS_L_EN_TETE = 24;
const MARGE_DU_CHOIX = 8;
const MARGE_BASSE_DU_CONTENU = 24;
const defilementPourMontrer = ({ haut, bas, hauteurFenetre, marge, margeHaut = marge }) =>
  Math.max(0, Math.min(bas + marge - hauteurFenetre, haut - margeHaut));
const decalagePourMontrer = ({ decalage, hauteurZone, haut, bas, ouverture = false }) => {
  const hautVisible = haut - decalage;
  const basVisible = bas - decalage;
  if (!ouverture && hautVisible < 0) return Math.max(0, haut - MARGE_SOUS_L_EN_TETE);
  if (basVisible <= hauteurZone) return null;
  const aDefiler = defilementPourMontrer({
    haut: hautVisible,
    bas: basVisible,
    hauteurFenetre: hauteurZone,
    marge: MARGE_AU_DESSUS_DU_PIED,
    margeHaut: ouverture ? MARGE_DU_CHOIX : MARGE_SOUS_L_EN_TETE,
  });
  return aDefiler > 0 ? decalage + aDefiler : null;
};
const suiteSousLePied = ({ decalage, hauteurZone, hauteurContenu }) =>
  decalage + hauteurZone < hauteurContenu - MARGE_BASSE_DU_CONTENU - 0.5;

// `optionCible` (src/types/demande.ts), lue dans le bloc : le dépôt passe la cible par la prop `ref` d'une option, que
// React 18 ne transmet pas à une fonction. Les options d'un groupe sont celles dont il est le groupe le plus proche.
const cibleDuBloc = (bloc, saisie) => {
  const groupe = saisie ? null : bloc.querySelector('[role="radiogroup"]');
  if (!groupe) return bloc.matches('input') ? bloc : bloc.querySelector('input');
  const options = Array.from(groupe.querySelectorAll('[role="radio"]')).filter((o) => o.closest('[role="radiogroup"]') === groupe);
  return options.find((o) => o.getAttribute('aria-checked') === 'true') || options[0] || null;
};

// La ligne entre en fondu, 200 ms — posée sous « réduire les animations ». Jamais au montage de l'étape : elle ne
// s'affiche qu'après un geste.
const Apparition = ({ children }) => {
  const noeud = React.useRef(null);
  React.useEffect(() => {
    if (noeud.current && noeud.current.animate && !animationsReduites()) {
      noeud.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FONDU_MS, easing: COURBE });
    }
  }, []);
  return <div ref={noeud} style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>;
};

export function StepShell({ section, step, total, children, onBack, onNext, nextLabel = 'Suivant', notice, motDeRamille, message, detail, manque, entree, reponsesDonnees = 0, style }) {
  // Sans `entree`, le kit retombe sur le numéro d'étape : la demande retombe quand même d'une étape à l'autre.
  const cle = entree ? entree.cle : step;
  const sens = entree ? entree.sens : null;
  const zone = React.useRef(null);
  const contenu = React.useRef(null);
  const etape = React.useRef(null);
  const premierRendu = React.useRef(true);
  const defiler = (y) => zone.current && zone.current.scrollTo({ top: y, behavior: animationsReduites() ? 'auto' : 'smooth' });
  const position = (noeud) => noeud.getBoundingClientRect().top - zone.current.getBoundingClientRect().top + zone.current.scrollTop;

  React.useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }
    if (zone.current) zone.current.scrollTop = 0;
    if (!sens || !contenu.current) return;
    contenu.current.focus({ preventScroll: true });
    if (etape.current && etape.current.animate && !animationsReduites()) {
      const depart = 'translateX(' + (sens === 'avant' ? DEPLACEMENT : -DEPLACEMENT) + 'px)';
      etape.current.animate([{ opacity: 0, transform: depart }, { opacity: 1, transform: 'none' }], { duration: ENTREE_MS, easing: COURBE });
    }
    // Le sens se lit à l'instant du changement d'étape, seule dépendance voulue.
  }, [cle]); // eslint-disable-line react-hooks/exhaustive-deps

  // La demande : l'étape où l'on a touché « Suivant » en attente. Elle retombe au rendu, dès qu'elle ne décrit plus
  // l'écran — l'étape est complète, ou ce n'est plus la même.
  const [demande, setDemande] = React.useState(null);
  const demandeActive = demande !== null && demande === cle && manque != null;
  if (demande !== null && !demandeActive) setDemande(null);

  // Les ancres que les étapes enregistrent (`useAncreDuChamp`) : où mène ce qui manque.
  const ancres = React.useRef(new Map());
  const enregistrer = React.useCallback((champ, ancre) => {
    ancres.current.set(champ, ancre);
    return () => {
      if (ancres.current.get(champ) === ancre) ancres.current.delete(champ);
    };
  }, []);
  const marque = demandeActive && seMarque(cle, manque.champ) ? manque.champ : null;

  // Le défilement vers ce qui manque part après le rendu du geste : au premier toucher, la ligne vient d'apparaître et
  // la zone a rétréci — on mesure dans sa nouvelle hauteur.
  const aMontrer = React.useRef(null);
  const [gestes, setGestes] = React.useState(0);
  React.useEffect(() => {
    const bloc = aMontrer.current;
    aMontrer.current = null;
    if (!bloc || !zone.current) return;
    const haut = position(bloc);
    const y = decalagePourMontrer({ decalage: zone.current.scrollTop, hauteurZone: zone.current.clientHeight, haut, bas: haut + bloc.offsetHeight });
    if (y !== null) defiler(y);
  }, [gestes]);

  const mener = () => {
    if (manque == null) return;
    setDemande(cle);
    const ancre = ancres.current.get(manque.champ);
    const bloc = ancre ? ancre.bloc.current : null;
    const cible = bloc ? cibleDuBloc(bloc, ancre.saisie) : null;
    if (!cible) {
      // Un champ demandé sans ancre ne se tait pas : la ligne s'affiche, et le focus retombe sur le haut de l'étape.
      console.warn('StepShell : « ' + manque.champ + ' » manque, mais aucune ancre ne le porte sur ' + cle + '.');
      if (contenu.current) contenu.current.focus({ preventScroll: true });
      return;
    }
    // Le focus au geste, avant tout défilement.
    cible.focus({ preventScroll: true });
    aMontrer.current = bloc;
    setGestes((n) => n + 1);
  };
  const suivant = () => {
    if (manque == null) {
      if (onNext) onNext();
    } else mener();
  };

  // Une ouverture ne se suit que si elle suit une réponse donnée sur l'étape (`reponsesDonnees`) : un préremplissage
  // ne fait rien défiler. La première ouverture qui suit une réponse la consomme.
  const [reponsesVues, setReponsesVues] = React.useState({ etape: cle, reponses: reponsesDonnees });
  if (reponsesVues.etape !== cle) setReponsesVues({ etape: cle, reponses: reponsesDonnees });
  const ouverture = (depli, borne) => {
    if (!zone.current || reponsesVues.etape !== cle || reponsesDonnees === reponsesVues.reponses) return;
    setReponsesVues({ etape: cle, reponses: reponsesDonnees });
    const y = decalagePourMontrer({
      decalage: zone.current.scrollTop,
      hauteurZone: zone.current.clientHeight,
      haut: position(borne || depli),
      bas: position(depli) + depli.offsetHeight,
      ouverture: true,
    });
    if (y !== null) defiler(y);
  };

  // Le filet : relu au défilement, et quand le contenu ou la zone changent de taille — la ligne qui apparaît la rétrécit.
  const [suite, setSuite] = React.useState(false);
  const relireLaSuite = () => {
    const z = zone.current;
    if (z) setSuite(suiteSousLePied({ decalage: z.scrollTop, hauteurZone: z.clientHeight, hauteurContenu: z.scrollHeight }));
  };
  React.useEffect(() => {
    const z = zone.current;
    if (!z || typeof ResizeObserver === 'undefined') return undefined;
    const observateur = new ResizeObserver(() =>
      setSuite(suiteSousLePied({ decalage: z.scrollTop, hauteurZone: z.clientHeight, hauteurContenu: z.scrollHeight }))
    );
    observateur.observe(z);
    if (contenu.current) observateur.observe(contenu.current);
    return () => observateur.disconnect();
  }, []);

  const Ancres = contexteDesAncres();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'var(--color-background)', ...style }}>
      <div style={{ padding: '8px 24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ProgressHeader section={section} step={step} total={total} />
        {notice && <div style={{ background: 'var(--color-background-selected)', borderRadius: 12, padding: '10px 16px' }}><ThemedText type="small" themeColor="accentText">{notice}</ThemedText></div>}
        {/* Le mot de Ramille à l'entrée d'une section, SANS `RamilleDit` : son visage est déjà dans l'en-tête, juste
            au-dessus — un second ferait deux Ramille sur le même écran. La phrase vient de `RAMILLE.entreeDeSection`. */}
        {motDeRamille && <ThemedText type="small" themeColor="textTertiary" style={{ lineHeight: '20px' }}>{motDeRamille}</ThemedText>}
      </div>
      <div ref={zone} onScroll={relireLaSuite} style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column' }}>
        {/* Le conteneur reçoit le focus d'une nouvelle étape ; l'étape, dessous, prend sa clé : elle remonte d'une étape
            à l'autre et entre du côté d'où l'on vient. */}
        <div ref={contenu} tabIndex={-1} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          <div key={cle} ref={etape} style={{ display: 'flex', flexDirection: 'column', gap: 32, flexGrow: 1 }}>
            <Ancres.Provider value={{ enregistrer, marque, principale: QUESTION_PRINCIPALE[cle] || null, ouverture }}>{children}</Ancres.Provider>
          </div>
        </div>
      </div>
      <div style={{ position: 'relative', padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* En position absolue : rien ne bouge quand il apparaît. */}
        {suite && <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'var(--color-border)' }} />}
        <MessageInline message={message || null} />
        {/* La cause technique, à recopier : brute, en chasse fixe — ni la voix de Ramille ni un ton rassurant. */}
        {detail && <ThemedText type="code" themeColor="textTertiary" style={{ lineHeight: '18px' }}>{detail}</ThemedText>}
        {/* Un lien vers la même question que le « Suivant » qu'on vient de toucher. Pas d'alerte : ce n'est pas un échec,
            et le focus qui part vers la question fait déjà l'annonce. */}
        {demandeActive && (
          <Apparition>
            <TextLink label={'Il manque encore ' + manque.phrase + '.'} onPress={mener} type="small" weight={600} themeColor="accentText" />
          </Apparition>
        )}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {onBack && <Button title="Retour" variant="secondary" onPress={onBack} style={{ width: 'auto' }} />}
          {/* Un bouton ordinaire, jamais `disabled` : sur une étape incomplète, il garde l'apparence du désactivé et
              mène à ce qui manque au lieu d'avancer. Son nom ne change jamais. */}
          <Button title={nextLabel} onPress={suivant} enAttente={manque != null} flex />
        </div>
      </div>
    </div>
  );
}
