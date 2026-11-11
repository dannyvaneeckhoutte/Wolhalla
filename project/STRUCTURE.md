# Project structure

## Workspace

The workspace contains a WPF desktop application and its project tracking area.

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

The app stores `wolhalla.db` and copied yarn photos under
`%LOCALAPPDATA%\Wolhalla`, outside the source tree. Update this outline as tests
and supporting assets are added.
