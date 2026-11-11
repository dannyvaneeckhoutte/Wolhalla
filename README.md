# Wolhalla

Wolhalla is een browserapp om je garenvoorraad en projecten bij te houden. De
app werkt zonder account of server en kan als statische site op GitHub Pages
draaien.

## Functies

- Garen beheren met merk, kleur, dikte, samenstelling, lengte en aantal bollen.
- Projecten koppelen, foto's toevoegen, zoeken en sorteren.
- Je voorraad bewaren in de browser en back-ups exporteren of importeren.

## GitHub Pages

De workflow [`pages.yml`](./.github/workflows/pages.yml) publiceert de inhoud
van [`web/`](./web/) na een push naar `master` of `main`. Schakel onder
**Settings > Pages** de publicatiebron **GitHub Actions** in.

## Gegevens en lokaal gebruik

Voorraad en foto's worden lokaal in je browser bewaard. Ze worden niet
gesynchroniseerd met andere browsers of apparaten. Een back-up importeren
vervangt de huidige voorraad. Foto's mogen maximaal 5 MB groot zijn.

Open de bestanden in `web/` via een lokale statische webserver om de app lokaal
te gebruiken; er zijn geen pakketinstallaties of buildstappen nodig.

Zie [project/STRUCTURE.md](./project/STRUCTURE.md) voor de projectindeling.
