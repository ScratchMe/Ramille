#!/usr/bin/env python3
# Compare chaque prop passée à un composant du kit dans .design-sync/previews/*.tsx à son
# <Nom>Props (docs/design/design-system/components/**/<Nom>.d.ts), et signale les
# obligatoires absentes. Regex, sans dépendance ; se lance depuis la racine du dépôt
# (NOTES.md, relevés du 26/09/2026 et du 28/09/2026).
import glob, os, re, sys

KIT = 'docs/design/design-system/components'
props = {}
for dts in glob.glob(f'{KIT}/**/*.d.ts', recursive=True):
    nom = os.path.basename(dts)[:-5]
    src = open(dts, encoding='utf-8').read()
    m = re.search(r'interface\s+' + re.escape(nom) + r'Props\s*\{', src)
    if not m:
        continue
    i, prof = m.end(), 1
    while prof and i < len(src):
        prof += {'{': 1, '}': -1}.get(src[i], 0)
        i += 1
    corps = src[m.end():i - 1]
    corps = re.sub(r'/\*.*?\*/', '', corps, flags=re.S)
    corps = re.sub(r'//[^\n]*', '', corps)
    champs = {}
    prof = 0
    for ligne in corps.split('\n'):
        if prof == 0:
            c = re.match(r'\s*([A-Za-z_$][\w$]*)(\?)?\s*:', ligne)
            if c:
                champs[c.group(1)] = c.group(2) is None
        prof += ligne.count('{') + ligne.count('(') - ligne.count('}') - ligne.count(')')
    props[nom] = champs

ecarts = 0
for tsx in sorted(glob.glob('.design-sync/previews/*.tsx')):
    src = open(tsx, encoding='utf-8').read()
    for m in re.finditer(r'<([A-Z][A-Za-z]+)((?:[^<>{}]|\{(?:[^{}]|\{[^{}]*\})*\})*?)/?>', src):
        nom, attrs = m.group(1), m.group(2)
        if nom not in props:
            continue
        sans_valeurs = re.sub(r'\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}', '{}', attrs)
        sans_valeurs = re.sub(r'"[^"]*"', '""', sans_valeurs)
        passes = set(re.findall(r'([A-Za-z_$][\w$-]*)\s*=', sans_valeurs))
        # Les booléens sans valeur (`selected`, `focused`) : un nom nu, hors de toute valeur.
        passes |= set(re.findall(r'(?:^|\s)([A-Za-z_$][\w$-]*)(?=\s|/?$)', re.sub(r'([A-Za-z_$][\w$-]*)\s*=\s*(\{\}|"")', ' ', sans_valeurs)))
        if '{...' in attrs:
            continue
        ligne = src[:m.start()].count('\n') + 1
        for p in sorted(passes - set(props[nom]) - {'key', 'children'}):
            print(f'{tsx}:{ligne}: <{nom}> prop inconnue « {p} »'); ecarts += 1
        enfants = not m.group(0).endswith('/>')
        for p, obligatoire in props[nom].items():
            if obligatoire and p not in passes and not (p == 'children' and enfants):
                print(f'{tsx}:{ligne}: <{nom}> prop obligatoire absente « {p} »'); ecarts += 1

print(f'{len(props)} interfaces lues, {ecarts} écart(s).')
sys.exit(1 if ecarts else 0)
