import React from 'react';
// Source : src/components/accueil/film-de-presentation.web.tsx — le film de présentation sur la page d'accueil du web
// (23/10/2026, étape 5 de `v1-35`). Une balise `<video>` du navigateur, avec ses contrôles : **rien ne se lance seul**,
// ni lecture automatique ni boucle, et rien ne se télécharge avant qu'on le demande (`preload="none"`) — l'affiche
// suffit à le montrer. Le format se choisit une fois, à l'arrivée : le 4:5 sous 600 de large, le 16:9 au-delà. L'arrondi
// est porté par la vidéo, pas par un cadre qui la découperait : la découpe couperait son anneau de focus. Sur natif, le
// composant ne rend rien — la page d'accueil n'existe que sur le web.
export function FilmDePresentation({ format = '16x9', affiche, video, titre = 'Le fil de Ramille' }) {
  const rapport = format === '4x5' ? '4 / 5' : '16 / 9';
  return (
    <div style={{ width: '100%', aspectRatio: rapport, borderRadius: 18, background: 'var(--color-background-element)' }}>
      <video controls playsInline preload="none" poster={affiche} aria-label={titre}
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', borderRadius: 18 }}>
        {video ? <source src={video} type="video/mp4" /> : null}
      </video>
    </div>
  );
}
