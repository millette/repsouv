import json, unittest
from classify import classer, DONNEES, CONTROLE, DEPENDANCE

OUTILS = {o["nom"]: o for o in json.load(open("outils.json", encoding="utf-8"))}

def criteres(nom):
    o = OUTILS[nom]
    return classer(o["description"], o["score"])[0]

class TestClassify(unittest.TestCase):
    def test_trois_etoiles_donnent_les_trois_criteres(self):
        self.assertEqual(criteres("Obsidian"), [DONNEES, CONTROLE, DEPENDANCE])

    def test_outil_non_canadien_auto_hebergeable(self):
        self.assertEqual(criteres("Nextcloud"), [DONNEES, DEPENDANCE])

    def test_outil_canadien_sauvegarde_au_canada_mais_dependant(self):
        self.assertEqual(criteres("La Réserve"), [DONNEES, CONTROLE])

    def test_serveur_canadien_nest_pas_un_controle_canadien(self):
        self.assertEqual(criteres("Framapad"), [DONNEES, DEPENDANCE])

    def test_sans_score_retient_les_indices_forts(self):
        d = OUTILS["Firefox"]["description"]
        self.assertEqual(classer(d)[0], [DONNEES, DEPENDANCE])

    def test_le_nombre_de_criteres_egale_le_score(self):
        for nom, o in OUTILS.items():
            self.assertEqual(len(criteres(nom)), o["score"], nom)

if __name__ == "__main__":
    unittest.main()
