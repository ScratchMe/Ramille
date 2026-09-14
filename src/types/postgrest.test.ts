import {
  CODE_JETON_TROP_NEUF,
  DELAIS_JETON_TROP_NEUF_MS,
  MESSAGE_JETON_TROP_NEUF,
  estJetonTropNeuf,
  fetchAvecSecondeChance,
  type FonctionFetch,
} from './postgrest';

const refusJetonTropNeuf = () =>
  new Response(JSON.stringify({ code: CODE_JETON_TROP_NEUF, message: MESSAGE_JETON_TROP_NEUF }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });

/**
 * Les formes que PostgREST produit vraiment, relevées dans sa table des erreurs : `PGRST303` est
 * « JWT claims validation or parsing failed » — donc l'expiration aussi — et `PGRST301` le refus
 * de **décodage**. Les fixtures de la première version de ce fichier associaient « JWT expired » à
 * `PGRST301`, une forme qui n'existe pas : le garde censé interdire le rejeu d'un jeton expiré
 * restait vert quoi que fasse le code.
 */
const REFUS_REELS = {
  enAvance: { code: 'PGRST303', message: MESSAGE_JETON_TROP_NEUF },
  expire: { code: 'PGRST303', message: 'JWT expired' },
  horsAudience: { code: 'PGRST303', message: 'JWT not in audience' },
  indecodable: { code: 'PGRST301', message: 'Expected 3 parts in JWT; got 2' },
} as const;

describe('estJetonTropNeuf', () => {
  it('reconnaît le jeton en avance à son code ET à son message', () => {
    expect(estJetonTropNeuf(REFUS_REELS.enAvance)).toBe(true);
    // Le message seul ne suffit pas : il faut être dans la famille des claims.
    expect(estJetonTropNeuf({ message: MESSAGE_JETON_TROP_NEUF })).toBe(false);
    // Et le code seul ne suffit pas non plus — c'est tout l'objet du correctif.
    expect(estJetonTropNeuf({ code: CODE_JETON_TROP_NEUF })).toBe(false);
  });

  it("ne prend pas un jeton EXPIRÉ pour un jeton en avance", () => {
    // **Le garde qui compte, et qui ne comptait pas.** L'expiration porte le même code que le
    // jeton en avance ; un jeton d'accès Supabase vit une heure, donc c'est l'état normal au
    // réveil de l'app. Le rejouer ajoutait 3,7 s avant que l'erreur ne sorte.
    expect(estJetonTropNeuf(REFUS_REELS.expire)).toBe(false);
    expect(estJetonTropNeuf(REFUS_REELS.horsAudience)).toBe(false);
    expect(estJetonTropNeuf(REFUS_REELS.indecodable)).toBe(false);
  });

  it("n'attrape aucun autre refus de jeton", () => {
    for (const code of ['PGRST301', 'PGRST302', 'PGRST300', 'PGRST116', '42501', '']) {
      expect(estJetonTropNeuf({ code, message: MESSAGE_JETON_TROP_NEUF })).toBe(false);
    }
  });

  it('ne lève sur aucune forme de corps', () => {
    // La valeur vient d'un serveur : on n'en sait rien avant de l'avoir regardée.
    for (const corps of [null, undefined, 'PGRST303', 303, [], [{ code: 'PGRST303' }], {}]) {
      expect(estJetonTropNeuf(corps)).toBe(false);
    }
  });
});

describe('fetchAvecSecondeChance', () => {
  /** Un `fetch` qui rend les réponses données, dans l'ordre, et compte ses appels. */
  function fetchFactice(...reponses: Response[]) {
    const appels: (RequestInfo | URL)[] = [];
    const fonction: FonctionFetch = async (entree) => {
      appels.push(entree);
      const reponse = reponses[appels.length - 1] ?? reponses[reponses.length - 1];
      return reponse;
    };
    return { fonction, appels };
  }

  const sansAttendre = async () => {};

  it('laisse passer une réponse normale sans rien faire', async () => {
    const { fonction, appels } = fetchFactice(new Response('[]', { status: 200 }));
    const reponse = await fetchAvecSecondeChance(fonction, sansAttendre)('https://exemple/rest');
    expect(reponse.status).toBe(200);
    expect(appels).toHaveLength(1);
  });

  it("s'arrête dès que le jeton passe", async () => {
    const { fonction, appels } = fetchFactice(
      refusJetonTropNeuf(),
      new Response('[]', { status: 200 })
    );
    const reponse = await fetchAvecSecondeChance(fonction, sansAttendre)('https://exemple/rest');
    expect(reponse.status).toBe(200);
    expect(appels).toHaveLength(2);
  });

  it('redemande une seconde fois, et jamais une troisième', async () => {
    // **Le garde du nombre.** Un écart qui durerait vraiment doit finir par s'afficher : la
    // dernière réponse est rendue telle quelle, sans être maquillée en première.
    const { fonction, appels } = fetchFactice(refusJetonTropNeuf());
    const reponse = await fetchAvecSecondeChance(fonction, sansAttendre)('https://exemple/rest');
    expect(appels).toHaveLength(1 + DELAIS_JETON_TROP_NEUF_MS.length);
    expect(appels).toHaveLength(3);
    expect(reponse.status).toBe(401);
    expect(await reponse.json()).toMatchObject({ code: CODE_JETON_TROP_NEUF });
  });

  it('passe dès la troisième tentative si elle aboutit', async () => {
    const { fonction, appels } = fetchFactice(
      refusJetonTropNeuf(),
      refusJetonTropNeuf(),
      new Response('[]', { status: 200 })
    );
    const reponse = await fetchAvecSecondeChance(fonction, sansAttendre)('https://exemple/rest');
    expect(reponse.status).toBe(200);
    expect(appels).toHaveLength(3);
  });

  it('ne redemande pour aucun autre refus', async () => {
    // Même garde que ci-dessus, vue depuis l'enveloppe : c'est ce test qui tomberait si
    // quelqu'un élargissait la condition à « tous les 401 ».
    const autres = [
      // Un jeton expiré : même code que le jeton en avance, et pourtant jamais rejoué.
      new Response(JSON.stringify(REFUS_REELS.expire), { status: 401 }),
      new Response(JSON.stringify(REFUS_REELS.indecodable), { status: 401 }),
      new Response(JSON.stringify({ code: '42501' }), { status: 401 }),
      new Response('pas du JSON', { status: 401 }),
      new Response('', { status: 401 }),
      // Le même corps, mais pas le même statut : le refus de jeton est un 401 et rien d'autre.
      new Response(JSON.stringify(REFUS_REELS.enAvance), { status: 500 }),
    ];
    for (const premiere of autres) {
      const { fonction, appels } = fetchFactice(premiere, new Response('[]', { status: 200 }));
      const reponse = await fetchAvecSecondeChance(fonction, sansAttendre)('https://exemple/rest');
      expect(appels).toHaveLength(1);
      expect(reponse).toBe(premiere);
    }
  });

  it("laisse le corps de la réponse lisible par l'appelant", async () => {
    // L'invariant de la copie. Sans `clone()`, le corps serait consommé par le contrôle et
    // **toutes** les erreurs de l'app deviendraient illisibles — en silence, et seulement sur
    // les chemins d'échec, c'est-à-dire là où personne ne regarde.
    const { fonction } = fetchFactice(new Response(JSON.stringify(REFUS_REELS.expire), { status: 401 }));
    const reponse = await fetchAvecSecondeChance(fonction, sansAttendre)('https://exemple/rest');
    expect(await reponse.json()).toEqual(REFUS_REELS.expire);
  });

  it('attend les délais déclarés, dans l’ordre', async () => {
    const attentes: number[] = [];
    const noter = async (ms: number) => {
      attentes.push(ms);
    };
    const { fonction } = fetchFactice(refusJetonTropNeuf(), new Response('[]', { status: 200 }));
    await fetchAvecSecondeChance(fonction, noter)('https://exemple/rest');
    expect(attentes).toEqual([DELAIS_JETON_TROP_NEUF_MS[0]]);

    // Et la seconde attente n'a lieu que si la seconde tentative échoue elle aussi.
    attentes.length = 0;
    const obstine = fetchFactice(refusJetonTropNeuf());
    await fetchAvecSecondeChance(obstine.fonction, noter)('https://exemple/rest');
    expect(attentes).toEqual([...DELAIS_JETON_TROP_NEUF_MS]);
  });

  it('accepte une URL comme une chaîne', async () => {
    const { fonction, appels } = fetchFactice(
      refusJetonTropNeuf(),
      new Response('[]', { status: 200 })
    );
    const reponse = await fetchAvecSecondeChance(
      fonction,
      sansAttendre
    )(new URL('https://exemple/rest'));
    expect(reponse.status).toBe(200);
    expect(appels).toHaveLength(2);
  });

  it("ne rejoue jamais un corps qui n'est pas une chaîne", async () => {
    // `storage-js` et `functions-js` transmettent le corps tel quel : un flux déjà consommé
    // lèverait au second envoi. Le garde d'origine ne regardait que l'URL.
    for (const body of [new Blob(['x']), new Uint8Array([1, 2]), new URLSearchParams({ a: 'b' })]) {
      const { fonction, appels } = fetchFactice(refusJetonTropNeuf());
      const reponse = await fetchAvecSecondeChance(
        fonction,
        sansAttendre
      )('https://exemple/rest', { method: 'POST', body: body as BodyInit });
      expect(appels).toHaveLength(1);
      expect(reponse.status).toBe(401);
    }
    // Un corps en chaîne, lui, reste rejouable : c'est ce que passent postgrest-js et auth-js.
    const { fonction, appels } = fetchFactice(refusJetonTropNeuf(), new Response('[]', { status: 200 }));
    const reponse = await fetchAvecSecondeChance(
      fonction,
      sansAttendre
    )('https://exemple/rest', { method: 'POST', body: '{"a":1}' });
    expect(appels).toHaveLength(2);
    expect(reponse.status).toBe(200);
  });

  it('ne rejoue jamais un `Request`', async () => {
    // Son corps est un flux, consommé au premier envoi : le rejouer lèverait. Aucun SDK Supabase
    // n'en passe, et c'est justement pour ça que l'invariant doit être tenu par le code.
    const { fonction, appels } = fetchFactice(refusJetonTropNeuf());
    const reponse = await fetchAvecSecondeChance(
      fonction,
      sansAttendre
    )(new Request('https://exemple/rest', { method: 'POST', body: '{}' }));
    expect(reponse.status).toBe(401);
    expect(appels).toHaveLength(1);
  });
});
