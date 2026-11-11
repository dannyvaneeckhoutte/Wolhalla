# Wolhalla

Wolhalla is een Windows-app om je garenvoorraad en de projecten waarin je garen
gebruikt te beheren. De app biedt lokaal opgeslagen garengegevens, aantallen
bollen, een doorzoekbare en sorteerbare voorraad, projectkoppelingen en foto's.

## Benodigdheden

- Windows 10 versie 2004 of hoger
- De .NET 10 SDK met ondersteuning voor Windows-desktopapps
- Visual Studio 2022 of Visual Studio Code met de C# Dev Kit (optioneel)

## Starten

```powershell
dotnet restore Wolhalla\Wolhalla.csproj
dotnet run --project Wolhalla\Wolhalla.csproj
```

Kies in VS Code **Terminal > Taak uitvoeren > Wolhalla: uitvoeren**. Kies
**Terminal > Taak uitvoeren > Wolhalla: bouwen** om de app te bouwen.

Wolhalla bewaart de SQLite-database en kopieën van garenfoto's in
`%LOCALAPPDATA%\Wolhalla`. Deze gegevens blijven op je computer en worden niet
opgenomen in de broncodeopslagplaats.

## Foto's analyseren

Kies eerst een garenfoto. **Foto lokaal analyseren** gebruikt de Windows OCR-
taalherkenning om tekst van het etiket te lezen en herkent waar mogelijk de
samenstelling, garendikte en lengte. Hiervoor is een passend OCR-taalpakket in
Windows nodig. De herkende waarden worden alleen als suggesties ingevuld; je
kunt ze controleren en aanpassen voordat je het garen opslaat.

**Foto analyseren met OpenAI...** kan ook merk, productnaam en een visuele
kleurindicatie voorstellen. Deze optie verstuurt de geselecteerde foto naar
OpenAI en vraagt daarvoor eerst om bevestiging. Configureer een OpenAI API-
sleutel met **OpenAI-sleutel instellen...**. Wolhalla bewaart deze sleutel in
Windows Credential Manager; de sleutel wordt niet in de broncode of database
opgeslagen. OpenAI API-gebruik kan kosten met zich meebrengen. De online
analyse vereist een JPG-, PNG-, WEBP- of GIF-afbeelding van maximaal 20 MB.

## Projectindeling

- `Wolhalla/` — WPF-app en SQLite-gegevenslaag.
- `project/` — projectlogboek, structuurinformatie en rapporten.
- `.vscode/tasks.json` — VS Code-taken om de app te bouwen en te starten.

Zie [project/STRUCTURE.md](./project/STRUCTURE.md) voor een uitgebreider overzicht.
