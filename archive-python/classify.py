# Classe les étoiles de chaque outil selon les trois critères du répertoire.
# Source: https://praxis.encommun.io/n/voRYZbuBYZKLejs8JyNkc5C4o7s/
# Usage: python3 -I classify.py <outils.json> <sortie.json>
#
# Principe: les descriptions n'énoncent pas les étoiles, elles les laissent deviner.
#  1. On mesure, par critère, la force des indices textuels (voir REGLES).
#  2. Le score connu fixe le NOMBRE de critères satisfaits: on retient les `score`
#     critères aux indices les plus forts (3 étoiles = les trois; 2 = on écarte le plus faible).
#  3. Sans score, on retient les critères dont l'indice atteint SEUIL.
#  4. La confiance dépend de l'écart entre le dernier critère retenu et le premier écarté.
import json, re, sys

DONNEES, CONTROLE, DEPENDANCE = "📍", "🏢", "🔗"
ORDRE = [DONNEES, CONTROLE, DEPENDANCE]  # départage des égalités
SEUIL = 2.0

HEBERGEMENT_CA = r"(?:serveurs?|infrastructures?|instances?|hébergement)\s+(?:canadien|québécois)\w*"
NON_CANADIEN = (r"non[- ]canadien|pas canadien|international|d'origine (?!canad|québé)\w+"
                r"|bien que (?:français|allemand)|conçue? en france")
CANADIEN = r"canadien|québécois|(?:conçue?|provenant|basée?) (?:au|du|en) (?:canada|québec)|conçue? au québec"

# (critère, regex, poids) appliqués au texte normalisé, après retrait des
# mentions d'hébergement canadien (qui concernent les données, pas le contrôle).
REGLES = [
    (DONNEES, r"(?<!conçu )(?<!conçue )au canada", 3),
    (DONNEES, HEBERGEMENT_CA, 3),
    (DONNEES, r"auto-?héberg", 3),
    (DONNEES, r"infrastructure (?:de son choix|choisie)|serveur contrôlé|installé", 3),
    (DONNEES, r"sur l'appareil|localement|local-first|pair-à-pair|hors ligne", 3),
    (DEPENDANCE, r"pair-à-pair|hors ligne|déconnecté|sans dépendre|local-first|localement|sur l'appareil", 3),
    (DEPENDANCE, r"serveurs indépendants|instances indépendantes|fédéré|décentralisé", 3),
    (DEPENDANCE, r"sans compte", 1),
    (DEPENDANCE, r"chiffrement de bout en bout", 1),
    (DEPENDANCE, r"\blibre|open source", 1),
    (DEPENDANCE, r"auto-?héberg", 1),
    (DEPENDANCE, r"sans supprimer la dépendance", -3),
]


def normaliser(texte):
    return texte.lower().replace("’", "'")


def evidences(description):
    t = normaliser(description)
    ev = {c: 0.0 for c in ORDRE}
    for critere, motif, poids in REGLES:
        if re.search(motif, t):
            ev[critere] += poids
    # Contrôle: on ignore "serveur canadien", etc., puis on cherche une nationalité explicite.
    sans_hebergement = re.sub(HEBERGEMENT_CA, "", t)
    if re.search(NON_CANADIEN, sans_hebergement):
        ev[CONTROLE] = -3
    elif re.search(CANADIEN, sans_hebergement):
        ev[CONTROLE] = 3
        ev[DONNEES] += 1.5  # a priori: un fournisseur canadien héberge au Canada
    return ev


def classer(description, score=None):
    """Retourne (critères satisfaits, confiance, évidences)."""
    ev = evidences(description)
    classement = sorted(ORDRE, key=lambda c: (-ev[c], ORDRE.index(c)))
    if score is None:
        retenus = [c for c in classement if ev[c] >= SEUIL]
        return sorted(retenus, key=ORDRE.index), "indéterminée", ev
    retenus = classement[:score]
    if score in (0, len(ORDRE)):
        confiance = "élevée"
    else:
        ecart = ev[classement[score - 1]] - ev[classement[score]]
        confiance = "élevée" if ecart >= 2 else "moyenne" if ecart >= 1 else "faible"
    return sorted(retenus, key=ORDRE.index), confiance, ev


def main(src, dst):
    outils = json.load(open(src, encoding="utf-8"))
    res = []
    for o in outils:
        criteres, confiance, ev = classer(o["description"], o["score"])
        res.append({"nom": o["nom"], "score": o["score"], "criteres": criteres,
                    "confiance": confiance, "evidences": ev})
    json.dump(res, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(len(res), "outils classés")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
