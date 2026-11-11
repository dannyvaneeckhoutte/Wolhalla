# Projectstructuur

## Werkruimte

De werkruimte bevat een WPF-desktopapp en de bijbehorende projectdocumentatie.

```text
Wolhalla/
  App.xaml
  Data/
    WolhallaDbContext.cs
  MainWindow.xaml
  MainWindow.xaml.cs
  Models/
    Project.cs
    Yarn.cs
  Wolhalla.csproj
.vscode/
  tasks.json
project/
  CHANGELOG.md
  README.md
  STRUCTURE.md
  reports/
README.md
```

De app bewaart `wolhalla.db` en kopieën van garenfoto's buiten de broncode, in
`%LOCALAPPDATA%\Wolhalla`. Werk dit overzicht bij wanneer er tests en aanvullende
bestanden worden toegevoegd.
