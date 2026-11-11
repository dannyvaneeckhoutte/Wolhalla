# Projectstructuur

De repository bevat de statische browserapp en de bijbehorende documentatie.

```text
web/
  app.js
  color-names.js
  index.html
  styles.css
.github/
  workflows/
    pages.yml
project/
  CHANGELOG.md
  README.md
  STRUCTURE.md
  reports/
README.md
```

De app gebruikt IndexedDB voor garen en projecten. `color-names.js` bevat de
Nederlandse labels voor CSS-kleurnamen. De workflow in
`.github/workflows/pages.yml` publiceert `web/` naar GitHub Pages.
