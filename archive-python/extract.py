# Extrait les outils du répertoire de souveraineté numérique vers un fichier JSON.
# Source: https://praxis.encommun.io/n/voRYZbuBYZKLejs8JyNkc5C4o7s/
# Usage: python3 -I extract.py <dossier contenant le .html sauvegardé> <outils.json> [criteres.json]
import re, json, sys, html, glob
src = glob.glob(sys.argv[1] + "/*.html")[0]
t = open(src, encoding="utf-8").read()
modif = "2026-11-05T09:53"
assert "5 novembre 2026 09:53" in t
out = []
for bq in re.findall(r"<blockquote>(.*?)</blockquote>", t, re.S):
    h = re.search(r"<h3>(.*?)</h3>", bq)
    if not h: continue
    title = html.unescape(h.group(1)).strip()
    icon, _, cat = title.partition(" ")
    for m in re.finditer(r'<p><strong><a [^>]*href="([^"]+)"[^>]*>(.*?)</a>(.*?)</strong></p>\s*<p>(.*?)</p>', bq, re.S):
        href, name, stars, desc = m.groups()
        out.append({
            "categorie": cat, "icone": icon,
            "nom": html.unescape(name).strip(),
            "score": stars.count("★"),
            "lien": href,
            "description": html.unescape(re.sub(r"<[^>]+>", "", desc)).strip(),
            "derniere_modification": modif,
        })
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(len(out))
if len(sys.argv) > 3:
    criteres = []
    for li in re.findall(r"<li>\s*<strong>(.*?)</strong>(.*?)</li>", t, re.S):
        titre = html.unescape(re.sub(r"<[^>]+>", "", li[0])).strip()
        if "?" not in titre: continue
        icon, _, titre = titre.partition(" ")
        criteres.append({"icon": icon, "titre": titre,
                         "description": html.unescape(re.sub(r"<[^>]+>", "", li[1])).strip()})
    json.dump(criteres, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(len(criteres), "critères")
