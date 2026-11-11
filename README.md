# Wolhalla

Wolhalla is a Windows desktop app for organizing yarn inventory and the projects
that use it. The initial app provides local yarn records, skein counts, searchable
and sortable stock, project associations, and photo attachments.

## Requirements

- Windows 10 or later
- .NET 10 SDK with Windows desktop development support
- Visual Studio 2022 or Visual Studio Code with the C# Dev Kit (optional)

## Run

```powershell
dotnet restore Wolhalla\Wolhalla.csproj
dotnet run --project Wolhalla\Wolhalla.csproj
```

In VS Code, use **Terminal > Run Task > Wolhalla: run**. Use
**Terminal > Run Task > Wolhalla: build** to build the app.

Wolhalla stores its SQLite database and copied yarn photos in
`%LOCALAPPDATA%\Wolhalla`. They remain on the computer and are not included in
the source repository.

## Project layout

- `Wolhalla/` — WPF application and SQLite data layer.
- `project/` — project changelog, structure notes, and reports.
- `.vscode/tasks.json` — VS Code build and run tasks.

See [project/STRUCTURE.md](./project/STRUCTURE.md) for a fuller outline.
