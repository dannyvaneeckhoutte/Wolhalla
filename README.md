# Wolhalla

Wolhalla is een Windows-app om je garenvoorraad en de projecten waarin je garen
gebruikt te beheren. De app biedt lokaal opgeslagen garengegevens, aantallen
bollen, een doorzoekbare en sorteerbare voorraad, projectkoppelingen en foto's.

## Benodigdheden

- Windows 10 of hoger
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

## Projectindeling

- `Wolhalla/` — WPF-app en SQLite-gegevenslaag.
- `project/` — projectlogboek, structuurinformatie en rapporten.
- `.vscode/tasks.json` — VS Code-taken om de app te bouwen en te starten.

Zie [project/STRUCTURE.md](./project/STRUCTURE.md) voor een uitgebreider overzicht.
