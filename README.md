# Wolhalla

Wolhalla is een browserapp om je garenvoorraad en projecten bij te houden. De
app werkt zonder account of server en kan als statische site op GitHub Pages
draaien.

[Open de live app](https://dannyvaneeckhoutte.github.io/Wolhalla/) ·
[Bekijk release v1.0.0](https://github.com/dannyvaneeckhoutte/Wolhalla/releases/tag/v1.0.0)

[![GitHub Pages deployment](https://github.com/dannyvaneeckhoutte/Wolhalla/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/dannyvaneeckhoutte/Wolhalla/actions/workflows/pages.yml)

## Functies

- Garen beheren met merk, kleurkiezer, dikte, samenstelling, lengte in meters en aantal bollen.
- Projecten koppelen, zoeken en sorteren op naam, kleur, merk of aantal bollen.
- Je voorraad bewaren in de browser en back-ups exporteren of importeren.

## GitHub Pages

De workflow [`pages.yml`](./.github/workflows/pages.yml) publiceert de inhoud
van [`web/`](./web/) na een push naar `main`. Schakel onder
**Settings > Pages** de publicatiebron **GitHub Actions** in.

## Gegevens en lokaal gebruik

De voorraad wordt lokaal in IndexedDB van je browser bewaard. Ze wordt niet
gesynchroniseerd met andere browsers of apparaten. Een back-up importeren
vervangt de huidige voorraad. Back-ups van versie 1 met lengtes in yards blijven
importeerbaar; deze worden bij het importeren naar meters omgerekend.

Open de bestanden in `web/` via een lokale statische webserver om de app lokaal
te gebruiken; er zijn geen pakketinstallaties of buildstappen nodig.

Zie [project/STRUCTURE.md](./project/STRUCTURE.md) voor de projectindeling.
