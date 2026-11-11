# Projectstructuur

De repository bevat de statische browserapp en de bijbehorende documentatie.

```text
web/
  app.js
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

De app gebruikt IndexedDB voor voorraad en foto's. De workflow in
`.github/workflows/pages.yml` publiceert `web/` naar GitHub Pages.
