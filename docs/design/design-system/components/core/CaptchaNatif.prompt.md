La carte du captcha : la case de Cloudflare, quand Cloudflare la demande, entourée d’une carte du produit et d’une phrase.

```jsx
<CaptchaNatif />
<CaptchaNatif visible={false} />
```

**Invisible pour presque tout le monde.** Le widget Turnstile est en mode *Managed* (`interaction-only`) : il ne demande rien à la plupart des visiteurs, et la carte ne se montre pas. Quand Cloudflare demande de cocher, la case cesse d’être seule au bord de l’écran : un voile, une carte aux couleurs du produit, et la phrase « Une dernière vérification : coche la case ci-dessous. », validée par la personne qui pilote le 04/10/2026. La case et son texte (« Vérifiez que vous êtes humain », au vouvoiement) appartiennent à Cloudflare et ne se changent pas.

**Deux minutes pour cocher**, à partir de la demande — et pas plus : passé ce délai, la personne arrive sur l’écran « La vérification n’a pas abouti ». Le délai et la file vivent dans `src/lib/captcha.ts`, la page de la vue web dans `src/types/captcha-natif.ts` ; ce composant ne décide rien.

Monté une fois, à la racine, par-dessus tout — jamais dans un écran. Sur web, la même carte est dessinée dans le DOM par `src/lib/captcha.ts`, et le composant ne rend rien.
