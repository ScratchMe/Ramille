#!/usr/bin/env python3
"""La musique du film « Le fil de Ramille », composée par le code et calée sur ses coupes.

    pip install numpy scipy
    python3 docs/communication/le-fil-de-ramille/musique.py

Écrit `musique.mp3` à côté du film (il faut `ffmpeg` dans le PATH). Le morceau est original et
déterministe : le même script rend le même fichier, et il n'y a aucun droit de tiers à gérer.

**Les points de synchronisation ne vivent pas ici.** Ils sont lus dans le bloc JSON
`temps-du-film` de `film.html`, que le film lit aussi : une coupe déplacée là emmène sa note, et
**la forme du morceau s'en déduit** — ses sections ne sont pas écrites en numéros de mesure. Le
script refuse de se rendre si une coupe quitte la grille : le visage, le bouton et la fin sur une
barre de mesure, chaque cloche sur une double croche, chaque section de la longueur que sa suite
d'accords demande. Changer `tempo` sans recaler le film le fait donc échouer, au lieu de décaler la
musique sous l'image.
Éprouvé le 03/10/2026, sur une copie, en faussant le bloc JSON — cinq mutations, cinq refus :
le visage à 24,1 s, le tempo à 110, une réponse à 54,7 s, la sortie du manifeste avancée d'une
mesure, la durée allongée d'une mesure.

Le morceau, à 100 battements par minute (une mesure = 2,4 s), en ré majeur — les mesures
indiquées sont celles du minutage actuel :
  - l'intro (mesures 0 à 9) : une nappe et un marimba clairsemé ; une cloche à chaque station du
    trajet, la basse à partir de la mesure 4, et un souffle qui monte vers le visage de Ramille ;
  - le rythme (10 à 25) entre au moment où son visage apparaît — grosse caisse douce, claquements,
    shaker, basse, arpège et mélodie ;
  - la respiration (26 à 28) : le manifeste, sans batterie, une cloche par ligne ;
  - la reprise (29 à 32) : le rythme revient avec les saisons, une cloche par saison ;
  - la fin (33 à 35) : un accent quand le bouton apparaît, puis l'accord final.
"""
import json
import pathlib
import re
import subprocess
import tempfile
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

ICI = pathlib.Path(__file__).resolve().parent
_html = (ICI / 'film.html').read_text(encoding='utf-8')
TEMPS = json.loads(re.search(r'<script type="application/json" id="temps-du-film">(.*?)</script>', _html, re.S).group(1))

SR = 44100
NOIRE = 60 / TEMPS['tempo']
MESURE = 4 * NOIRE
FIN = TEMPS['duree'] + 1.0  # la seconde de tenue de la vidéo sur sa dernière image
N = int((FIN + 4) * SR)     # marge pour les queues de réverbération, coupée à la fin
alea = np.random.default_rng(342)


def hz(note):
    return 440.0 * 2 ** ((note - 69) / 12)


def instants(duree):
    return np.arange(int(duree * SR)) / SR


def mesure(m, temps=0.0):
    return m * MESURE + temps * NOIRE


class Piste:
    """Un bus stéréo, avec son envoi vers la réverbération."""

    def __init__(self, gain, reverb=0.0):
        self.g = np.zeros(N)
        self.d = np.zeros(N)
        self.gain = gain
        self.reverb = reverb

    def poser(self, t, son, pan=0.0, vel=1.0):
        i = int(round(t * SR))
        if i >= N or i < 0:
            return
        n = min(len(son), N - i)
        angle = (pan + 1) * np.pi / 4  # panoramique à puissance constante
        self.g[i:i + n] += son[:n] * np.cos(angle) * vel
        self.d[i:i + n] += son[:n] * np.sin(angle) * vel

    def poser_stereo(self, t, g, d, vel=1.0):
        i = int(round(t * SR))
        n = min(len(g), N - i)
        self.g[i:i + n] += g[:n] * vel
        self.d[i:i + n] += d[:n] * vel


# ------------------------------------------------------------------ Les instruments

_MAILLOCHE = butter(2, [2000, 7000], btype='band', fs=SR, output='sos')


def marimba(note, duree=1.6, eclat=1.0):
    t = instants(duree)
    f = hz(note)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.5)
    if 3.93 * f < 15000:
        s += 0.45 * eclat * np.sin(2 * np.pi * 3.93 * f * t) * np.exp(-t / 0.13)
    if 9.24 * f < 15000:
        s += 0.16 * eclat * np.sin(2 * np.pi * 9.24 * f * t) * np.exp(-t / 0.045)
    choc = sosfilt(_MAILLOCHE, alea.standard_normal(len(t))) * np.exp(-t / 0.004) * 0.35 * eclat
    return (s + choc) * (1 - np.exp(-t / 0.0015))


def cloche(note, duree=3.5):
    t = instants(duree)
    f = hz(note)
    s = np.zeros_like(t)
    for rapport, amp, dec in [(1, 1.0, 1.7), (2.0, 0.35, 1.0), (3.0, 0.2, 0.6), (4.16, 0.14, 0.4), (5.43, 0.1, 0.25), (6.8, 0.06, 0.15)]:
        if rapport * f < 15000:
            s += amp * np.sin(2 * np.pi * rapport * f * t + alea.uniform(0, 2 * np.pi)) * np.exp(-t / dec)
    return s * (1 - np.exp(-t / 0.002))


def nappe(notes, duree, attaque=0.9, relache=1.6):
    t = instants(duree + relache)
    env = np.minimum(1, t / attaque) * np.where(t < duree, 1.0, np.clip((duree + relache - t) / relache, 0, 1))
    g = np.zeros_like(t)
    d = np.zeros_like(t)
    for note in notes:
        for cote, desaccord in ((0, -7), (0, 4), (1, 7), (1, -4)):
            f = hz(note) * 2 ** (desaccord / 1200)
            phase = alea.uniform(0, 2 * np.pi)
            onde = sum(np.sin(2 * np.pi * k * f * t + phase * k) / k ** 1.35 for k in range(1, 11) if k * f < 9000)
            if cote == 0:
                g += onde
            else:
                d += onde
    return g * env / len(notes), d * env / len(notes)


def basse(note, duree):
    t = instants(duree + 0.08)
    f = hz(note)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    env = (1 - np.exp(-t / 0.006)) * (0.65 + 0.35 * np.exp(-t / 0.25)) * np.clip((duree + 0.08 - t) / 0.08, 0, 1)
    return np.tanh(1.4 * s * env) / np.tanh(1.4)


def grosse_caisse():
    t = instants(0.5)
    f = 46 + 90 * np.exp(-t / 0.03)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    return s + alea.standard_normal(len(t)) * np.exp(-t / 0.0015) * 0.12


_BANDE_CLAQUEMENT = butter(2, [1800, 5200], btype='band', fs=SR, output='sos')
_AIGUS = butter(2, 7000, btype='high', fs=SR, output='sos')


def claquement():
    t = instants(0.2)
    return sosfilt(_BANDE_CLAQUEMENT, alea.standard_normal(len(t))) * np.exp(-t / 0.035) * 1.8


def shaker():
    t = instants(0.09)
    env = (1 - np.exp(-t / 0.006)) * np.exp(-t / 0.028)
    return sosfilt(_AIGUS, alea.standard_normal(len(t))) * env


def souffle(duree, f0=300, f1=7000, forme='monte'):
    """Un bruit filtré dont la coupure glisse de f0 à f1 : le « souffle » qui annonce une entrée."""
    n = int(duree * SR)
    bruit = alea.standard_normal(n)
    sortie = np.zeros(n)
    etat = None
    for i in range(0, n, 1024):
        k = i / n
        sos = butter(2, f0 * (f1 / f0) ** k, btype='low', fs=SR, output='sos')
        if etat is None:
            etat = np.zeros((sos.shape[0], 2))
        sortie[i:i + 1024], etat = sosfilt(sos, bruit[i:i + 1024], zi=etat)
    k = np.arange(n) / n
    env = k ** 2.2 if forme == 'monte' else np.sin(np.pi * k) ** 2
    return sortie * env


def impact():
    t = instants(1.6)
    f = 52 + 30 * np.exp(-t / 0.05)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.7)


def reponse_de_salle(duree=2.4, t60=2.0):
    t = instants(duree)
    attenuation = np.exp(-6.91 * t / t60)
    sos = butter(1, 5500, btype='low', fs=SR, output='sos')
    retard = int(0.018 * SR)
    reponses = []
    for _ in range(2):
        ir = sosfilt(sos, alea.standard_normal(len(t))) * attenuation
        ir[: int(0.005 * SR)] *= np.linspace(0, 1, int(0.005 * SR))
        ir = np.concatenate([np.zeros(retard), ir])
        reponses.append(ir / np.sqrt(np.sum(ir ** 2)))
    return reponses


# ------------------------------------------------------------------ L'harmonie et la forme

# ------------------------------------------------------------------ La forme, déduite du film


def sur_la_barre(t, quoi):
    m = t / MESURE
    assert abs(m - round(m)) < 1e-6, f'{quoi} ({t} s) ne tombe pas sur une barre de mesure de {MESURE} s'
    return round(m)


def sur_la_grille(t, quoi):
    d = t / (NOIRE / 4)
    assert abs(d - round(d)) < 1e-6, f'{quoi} ({t} s) ne tombe pas sur une double croche de {NOIRE / 4} s'


DROP = sur_la_barre(TEMPS['visage'], 'le visage')               # le rythme entre
BOUTON = sur_la_barre(TEMPS['bouton'], 'le bouton')             # la fin commence
TOTAL = sur_la_barre(TEMPS['duree'], 'la durée')
manif = TEMPS['manifeste']
PAUSE = int(np.ceil(manif['entree'] / MESURE))                  # l'aplat couvre la barre qui suit
assert 0 <= mesure(PAUSE) - manif['entree'] < 0.5, "l'aplat du manifeste doit entrer juste avant une barre"
REPRISE = round(manif['sortie'] / MESURE)
assert 0 < mesure(REPRISE) - manif['sortie'] < 0.5, "l'aplat du manifeste doit sortir juste avant une barre"
for quoi, t in [('une station', x) for x in TEMPS['arrets']] + [('le logo', TEMPS['logo']), ('la notification', TEMPS['notification'])] \
        + [('une réponse', x) for x in TEMPS['reponses']] + [('une ligne du manifeste', x) for x in manif['lignes']] \
        + [('une saison', x) for x in TEMPS['saisons']]:
    sur_la_grille(t, quoi)
assert all(mesure(REPRISE) <= t < mesure(BOUTON) for t in TEMPS['saisons']), 'les saisons tombent dans la reprise'

INTRO = 'D Bm G A D Bm G A G A'.split()
RYTHME = 'D Bm G A'.split()
RESPIRATION = 'G Em A'.split()
FIN_ = 'D G D'.split()
assert DROP == len(INTRO), f"l'intro fait {len(INTRO)} mesures, le visage arrive à la mesure {DROP}"
assert (PAUSE - DROP) % 4 == 0, f'le rythme ({PAUSE - DROP} mesures) se compte par quatre'
assert REPRISE - PAUSE == len(RESPIRATION), f'la respiration fait {len(RESPIRATION)} mesures, le manifeste en couvre {REPRISE - PAUSE}'
assert BOUTON - REPRISE == len(RYTHME), f'la reprise fait {len(RYTHME)} mesures, les saisons en laissent {BOUTON - REPRISE}'
assert TOTAL - BOUTON == len(FIN_), f'la fin fait {len(FIN_)} mesures, le bouton en laisse {TOTAL - BOUTON}'
ACCORDS = INTRO + RYTHME * ((PAUSE - DROP) // 4) + RESPIRATION + RYTHME + FIN_
DERNIERE = TOTAL - 1
GROOVE = set(range(DROP, PAUSE)) | set(range(REPRISE, BOUTON))
RESPIRE = set(range(PAUSE, REPRISE))
MONTEE = set(range(DROP - 4, DROP))                              # le shaker qui annonce le rythme

NAPPE = {'D': [57, 61, 64, 66], 'Bm': [57, 61, 62, 66], 'G': [57, 59, 62, 66], 'A': [57, 59, 61, 64], 'Em': [55, 59, 62, 66]}
BASSE = {'D': 38, 'Bm': 35, 'G': 43, 'A': 45, 'Em': 40}
ARPEGE = {
    'D': [74, 69, 78, 69, 76, 69, 78, 81], 'Bm': [71, 66, 74, 66, 73, 66, 74, 78],
    'G': [67, 74, 71, 74, 69, 74, 71, 78], 'A': [69, 76, 73, 76, 71, 76, 73, 76],
    'Em': [64, 71, 67, 71, 66, 71, 67, 74],
}
# Deux motifs de quatre mesures (D Bm G A) : (temps, note, durée en temps).
MOTIF_A = [
    [(0, 78, 1), (1.5, 76, 0.5), (2, 74, 1), (3, 69, 1)],
    [(0, 71, 1), (1, 74, 0.5), (1.5, 78, 1.5), (3.5, 76, 0.5)],
    [(0, 74, 1), (1, 71, 1), (2, 74, 0.5), (2.5, 76, 1.5)],
    [(0, 73, 1.5), (1.5, 76, 0.5), (2, 69, 2)],
]
MOTIF_B = [
    [(0, 81, 1), (1, 78, 0.5), (1.5, 81, 0.5), (2, 83, 1), (3, 81, 1)],
    [(0, 78, 1.5), (1.5, 76, 0.5), (2, 74, 1), (3, 76, 1)],
    [(0, 79, 1), (1, 78, 1), (2, 74, 1), (3, 71, 1)],
    [(0, 73, 1), (1, 76, 1), (2, 81, 2)],
]

# Les gains se règlent à la mesure, pas à l'oreille seule : niveau et part d'aigus de chaque piste
# relevés le 03/10/2026 sur la partie rythmée, alors de 24 à 57 s — la basse dominait de 17 dB un shaker
# inaudible.
pistes = {
    'nappe': Piste(0.18, 0.35), 'arpege': Piste(0.22, 0.28), 'melodie': Piste(0.27, 0.25),
    'cloches': Piste(0.28, 0.5), 'basse': Piste(0.22), 'grosse_caisse': Piste(0.42),
    'claquement': Piste(0.6, 0.2), 'shaker': Piste(0.45), 'effets': Piste(0.13, 0.3),
}
caisses = []

for m, accord in enumerate(ACCORDS):
    debut = mesure(m)
    # La nappe : plus présente quand la batterie se tait.
    vel_nappe = 0.8 if m in RESPIRE else 1.0 if m == DERNIERE else 0.6 if m in GROOVE else 0.85
    duree = MESURE * (2.6 if m == DERNIERE else 1)
    g, d = nappe(NAPPE[accord], duree)
    pistes['nappe'].poser_stereo(debut, g, d, vel_nappe)

    # La basse.
    if m in GROOVE:
        for croche, ecart, longueur in ((0, 0, 1.5), (3, 0, 0.5), (4, 0, 1.5), (6, 7, 0.5), (7, 12, 0.5)):
            pistes['basse'].poser(debut + croche * NOIRE / 2, basse(BASSE[accord] + ecart, longueur * NOIRE / 2 * 0.9), vel=0.8)
    elif m >= 4:
        pistes['basse'].poser(debut, basse(BASSE[accord], MESURE * (2.4 if m == DERNIERE else 0.95)), vel=0.7)

    # L'arpège : à la noire au début, à la croche ensuite, à la double croche dans le rythme.
    motif = ARPEGE[accord]
    if m < 4:
        pas, vel = 4, 0.5
    elif m in GROOVE:
        pas, vel = 1, 0.32
    elif m in RESPIRE or m == DERNIERE:
        pas, vel = 0, 0
    else:
        pas, vel = 2, 0.42
    if pas:
        for k in range(0, 16, pas):
            accent = 1.0 if k % 4 == 0 else 0.75
            pistes['arpege'].poser(debut + k * NOIRE / 4, marimba(motif[k % 8], 1.2), pan=-0.25 if k % 2 else 0.25, vel=vel * accent)

    # La batterie.
    if m in GROOVE:
        for temps in (0, 2):
            caisses.append(debut + temps * NOIRE)
        for temps in (1, 3):
            pistes['claquement'].poser(debut + temps * NOIRE, claquement(), pan=-0.15)
        for k in range(16):
            pistes['shaker'].poser(debut + k * NOIRE / 4, shaker(), pan=0.3, vel=[0.9, 0.45, 0.7, 0.45][k % 4] * alea.uniform(0.85, 1.0))
    elif m in MONTEE:
        for k in range(0, 16, 2 if m < DROP - 1 else 1):
            pistes['shaker'].poser(debut + k * NOIRE / 4, shaker(), pan=0.3, vel=0.5 * (0.9 if k % 4 == 0 else 0.6))

# La mélodie : A, B, A, B sur le rythme — puis elle laisse la place aux cloches des saisons.
for j, depart in enumerate(range(DROP, PAUSE, 4)):
    motif = MOTIF_B if j % 2 else MOTIF_A
    for i in range(4):
        for temps, note, duree in motif[i]:
            pistes['melodie'].poser(mesure(depart + i, temps), marimba(note, max(1.4, duree * NOIRE * 1.6), eclat=0.8), vel=0.9)

for t in caisses:
    pistes['grosse_caisse'].poser(t, grosse_caisse())

# ------------------------------------------------------------------ Les rendez-vous avec l'image

for t, note in zip(TEMPS['arrets'], (74, 78, 81, 86)):
    pistes['cloches'].poser(t, cloche(note), vel=0.55)                    # chaque station du trajet
for i, note in enumerate((74, 76, 78, 81, 83)):
    pistes['arpege'].poser(TEMPS['barres'] + i * 0.1, marimba(note, 1.0), vel=0.4)  # les postes qui poussent
pistes['cloches'].poser(TEMPS['logo'], cloche(81), vel=0.5)                # la feuille se remplit
pistes['effets'].poser(mesure(DROP - 2), souffle(TEMPS['visage'] - mesure(DROP - 2)), vel=0.9)
pistes['cloches'].poser(TEMPS['visage'], cloche(74), vel=0.7)              # le visage, et le rythme entre
pistes['cloches'].poser(TEMPS['visage'], cloche(86), vel=0.35)
pistes['cloches'].poser(TEMPS['notification'], cloche(81), vel=0.4)        # la notification
pistes['cloches'].poser(TEMPS['notification'] + 0.15, cloche(86), vel=0.35)
# Chaque réponse, au même poids, en ré : un la doublait la mélodie, qui en joue un 0,15 s plus tôt
# sous la deuxième réponse (mesuré le 03/10/2026 : +3 dB seulement sur sa fondamentale).
for t in TEMPS['reponses']:
    pistes['cloches'].poser(t, cloche(86), vel=0.4)
pistes['effets'].poser(manif['entree'] - 0.25, souffle(0.95, 400, 3000, 'cloche'), vel=0.8)
for t, note in zip(manif['lignes'], (81, 83, 86, 90)):                      # une ligne, une cloche
    pistes['cloches'].poser(t, cloche(note, 4.0), vel=0.85)
pistes['effets'].poser(manif['sortie'] - 0.2, souffle(0.95, 400, 3000, 'cloche'), vel=0.7)
pistes['effets'].poser(mesure(REPRISE - 1), souffle(MESURE), vel=0.8)
for t, note in zip(TEMPS['saisons'], (74, 78, 81, 83)):                     # une saison, une cloche
    pistes['cloches'].poser(t, cloche(note), vel=0.6)
pistes['effets'].poser(mesure(BOUTON - 1), souffle(TEMPS['bouton'] - mesure(BOUTON - 1)), vel=0.6)
caisses.append(TEMPS['bouton'])
pistes['grosse_caisse'].poser(TEMPS['bouton'], grosse_caisse())
pistes['effets'].poser(TEMPS['bouton'], impact(), vel=2.2)                  # le bouton apparaît
for note in (62, 69, 74, 81):
    pistes['cloches'].poser(TEMPS['bouton'], cloche(note, 4.5), vel=0.45)
for i, note in enumerate((62, 66, 69, 74, 78, 81)):                         # l'accord final, égrené
    pistes['melodie'].poser(mesure(DERNIERE) + i * 0.09, marimba(note, 3.0, eclat=0.6), vel=0.55)
pistes['cloches'].poser(mesure(DERNIERE), cloche(86, 5.0), vel=0.5)

# ------------------------------------------------------------------ Le mélange

# La grosse caisse creuse un peu la nappe et la basse : c'est ce qui fait respirer le rythme.
pompe = np.ones(N)
t_pompe = instants(0.4)
creux = 1 - 0.3 * np.exp(-t_pompe / 0.16)
for t in caisses:
    i = int(t * SR)
    n = min(len(creux), N - i)
    pompe[i:i + n] = np.minimum(pompe[i:i + n], creux[:n])

gauche = np.zeros(N)
droite = np.zeros(N)
envoi_g = np.zeros(N)
envoi_d = np.zeros(N)
for nom, p in pistes.items():
    facteur = pompe if nom in ('nappe', 'basse') else 1.0
    g, d = p.g * p.gain * facteur, p.d * p.gain * facteur
    gauche += g
    droite += d
    envoi_g += g * p.reverb
    envoi_d += d * p.reverb

ir_g, ir_d = reponse_de_salle()
gauche += fftconvolve(envoi_g, ir_g)[:N] * 0.9
droite += fftconvolve(envoi_d, ir_d)[:N] * 0.9

graves = butter(2, 45, btype='high', fs=SR, output='sos')
air = butter(2, 2800, btype='high', fs=SR, output='sos')
gauche, droite = sosfilt(graves, gauche), sosfilt(graves, droite)
gauche, droite = gauche + 0.9 * sosfilt(air, gauche), droite + 0.9 * sosfilt(air, droite)

stereo = np.stack([gauche, droite], axis=1)[: int(FIN * SR)]
stereo /= np.max(np.abs(stereo)) / 0.89
fondu = int(1.4 * SR)
stereo[-fondu:] *= np.linspace(1, 0, fondu)[:, None] ** 1.5
stereo = np.tanh(stereo * 1.1) / np.tanh(1.1)

with tempfile.TemporaryDirectory() as dossier:
    brut = pathlib.Path(dossier) / 'musique.wav'
    with wave.open(str(brut), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(stereo, -1, 1) * 32767).astype('<i2').tobytes())
    # Deux passes : la première mesure le niveau, la seconde l'ajuste d'un gain fixe, sans
    # comprimer ce que le mélange a construit.
    cible = 'I=-15:TP=-1.5:LRA=11'
    mesure_ = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(brut), '-af', f'loudnorm={cible}:print_format=json', '-f', 'null', '-'],
                             capture_output=True, text=True, check=True).stderr
    m_ = json.loads(mesure_[mesure_.rindex('{'):mesure_.rindex('}') + 1])
    filtre = (f"loudnorm={cible}:linear=true:measured_I={m_['input_i']}:measured_TP={m_['input_tp']}"
              f":measured_LRA={m_['input_lra']}:measured_thresh={m_['input_thresh']}:offset={m_['target_offset']}")
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(brut), '-af', filtre, '-ar', str(SR),
                    '-c:a', 'libmp3lame', '-b:a', '192k', str(ICI / 'musique.mp3')], check=True)
print(f"{ICI / 'musique.mp3'} — {FIN:.1f} s, {TEMPS['tempo']} battements par minute.")
