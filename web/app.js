const DATABASE_NAME = "wolhalla-web";
const DATABASE_VERSION = 2;
const STORE_NAME = "yarns";
const DEFAULT_COLOR = "#355747";
const BACKUP_FORMAT = "wolhalla-backup";
const THEME_STORAGE_KEY = "wolhalla-theme";
const COLOR_PALETTE = window.WolhallaColorNames;
const COLOR_BY_NAME = new Map();
const COLOR_BY_CSS_NAME = new Map();
const COLOR_BY_HEX = new Map();

for (const color of COLOR_PALETTE) {
  const name = normalizeColorName(color.name);
  if (!COLOR_BY_NAME.has(name)) COLOR_BY_NAME.set(name, color);
  COLOR_BY_CSS_NAME.set(color.cssName, color);
  if (!COLOR_BY_HEX.has(color.hex)) COLOR_BY_HEX.set(color.hex, color);
}

const form = document.querySelector("#yarn-form");
const yarnList = document.querySelector("#yarn-list");
const searchInput = document.querySelector("#search");
const sortSelect = document.querySelector("#sort");
const colorInput = document.querySelector("#color");
const colorPicker = document.querySelector("#color-picker");
const thumbnailViewButton = document.querySelector("#thumbnail-view");
const listViewButton = document.querySelector("#list-view");
const themeToggleButton = document.querySelector("#theme-toggle");
const themeToggleIcon = document.querySelector("#theme-toggle-icon");
const themeToggleLabel = document.querySelector("#theme-toggle-label");
const saveButton = document.querySelector("#save-button");
const deleteButton = document.querySelector("#delete-button");
const toast = document.querySelector("#toast");

let yarns = [];
let selectedId = null;
let selectedColorHex = DEFAULT_COLOR;
let viewMode = "list";
let toastTimer;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = (event) => {
      const database = request.result;
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
      if (event.oldVersion < 2) {
        const store = request.transaction.objectStore(STORE_NAME);
        const cursorRequest = store.openCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) return;
          const yarn = cursor.value;
          const yardage = yarn.yardage;
          yarn.lengthMeters = yardage == null || yardage === "" ? null : yardsToMeters(yardage);
          delete yarn.yardage;
          cursor.update(yarn);
          cursor.continue();
        };
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Sluit andere Wolhalla-tabbladen en laad de pagina opnieuw om je voorraad bij te werken."));
  });
}

const database = openDatabase();

async function transact(mode, operation) {
  const db = await database;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    let result;
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("De databasebewerking is afgebroken."));
    try {
      result = operation(transaction.objectStore(STORE_NAME));
    } catch (error) {
      transaction.abort();
      reject(error);
    }
  });
}

async function loadYarns() {
  const db = await database;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("De voorraad kon niet worden geladen."));
  });
}

function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.setAttribute("role", isError ? "alert" : "status");
  toast.classList.add("is-visible");
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3600);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeColorName(value) {
  return text(value).toLocaleLowerCase("nl")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]/g, "");
}

function isHexColor(value) {
  return typeof value === "string" && /^#[\da-f]{6}$/i.test(value);
}

function findNamedColor(value) {
  const normalized = normalizeColorName(value);
  return COLOR_BY_NAME.get(normalized)
    || COLOR_BY_CSS_NAME.get(normalized)
    || COLOR_BY_HEX.get(normalized);
}

function nearestNamedColor(value) {
  const hex = text(value).toLowerCase();
  const exact = COLOR_BY_HEX.get(hex);
  if (exact) return exact;

  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  let nearest = COLOR_PALETTE[0];
  let shortestDistance = Number.POSITIVE_INFINITY;
  for (const color of COLOR_PALETTE) {
    const colorRed = Number.parseInt(color.hex.slice(1, 3), 16);
    const colorGreen = Number.parseInt(color.hex.slice(3, 5), 16);
    const colorBlue = Number.parseInt(color.hex.slice(5, 7), 16);
    const distance = (red - colorRed) ** 2 + (green - colorGreen) ** 2 + (blue - colorBlue) ** 2;
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearest = color;
    }
  }
  return nearest;
}

function displayColorName(value) {
  const named = findNamedColor(value);
  if (named) return named.name;
  return isHexColor(value) ? nearestNamedColor(value).name : text(value);
}

function yarnColorHex(yarn) {
  if (isHexColor(yarn.colorHex)) return yarn.colorHex.toLowerCase();
  if (isHexColor(yarn.color)) return yarn.color.toLowerCase();
  return findNamedColor(yarn.color)?.hex || null;
}

function populateColorSuggestions() {
  const uniqueNames = new Map();
  for (const color of COLOR_PALETTE) {
    const key = normalizeColorName(color.name);
    if (!uniqueNames.has(key)) uniqueNames.set(key, color.name);
  }

  const options = Array.from(uniqueNames.values())
    .sort((a, b) => a.localeCompare(b, "nl"))
    .map((name) => {
      const option = document.createElement("option");
      option.value = name;
      return option;
    });
  document.querySelector("#color-suggestions").replaceChildren(...options);
}

function yardsToMeters(value) {
  return Number(value) * 0.9144;
}

function formatLengthMeters(value) {
  if (value === null || value === undefined || value === "") return "";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `${new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 }).format(amount)} m`
    : "";
}

function formatSkeinWeightGrams(value) {
  if (value === null || value === undefined || value === "") return "";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `${new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 }).format(amount)} g`
    : "";
}

function projectNames(value) {
  const names = [];
  const seen = new Set();
  const parts = Array.isArray(value) ? value : text(value).split(/[;,]/);
  for (const name of parts.map((part) => text(part)).filter(Boolean)) {
    const key = name.toLocaleLowerCase("nl");
    if (!seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
  }
  return names;
}

function createChip(label, className = "detail-chip") {
  const chip = document.createElement("span");
  chip.className = className;
  chip.textContent = label;
  return chip;
}

function createYarnCard(yarn) {
  const card = document.createElement("article");
  card.className = "yarn-card";

  const button = document.createElement("button");
  button.className = "card-edit";
  button.type = "button";
  button.setAttribute("aria-label", `Bewerk ${yarn.name}`);
  button.addEventListener("click", () => selectYarn(yarn.id));

  const swatch = document.createElement("span");
  swatch.className = "yarn-swatch";
  swatch.setAttribute("aria-hidden", "true");
  swatch.textContent = "w";
  const swatchColor = yarnColorHex(yarn);
  if (swatchColor || (window.CSS && CSS.supports("color", text(yarn.color)))) {
    swatch.style.backgroundColor = swatchColor || text(yarn.color);
    swatch.classList.add("has-color");
  }
  button.append(swatch);

  const content = document.createElement("div");
  content.className = "yarn-content";
  const topLine = document.createElement("div");
  topLine.className = "yarn-topline";
  const title = document.createElement("h3");
  title.className = "yarn-title";
  title.textContent = yarn.name;
  const quantity = document.createElement("span");
  quantity.className = "quantity-pill";
  quantity.textContent = `${yarn.quantity} ${yarn.quantity === 1 ? "bol" : "bollen"}`;
  topLine.append(title, quantity);
  content.append(topLine);

  const brand = document.createElement("p");
  brand.className = "yarn-brand";
  brand.textContent = yarn.brand || "Merk onbekend";
  content.append(brand);

  const details = document.createElement("div");
  details.className = "yarn-details";
  [
    displayColorName(yarn.color),
    yarn.weight,
    yarn.fiber,
    formatLengthMeters(yarn.lengthMeters),
    formatSkeinWeightGrams(yarn.skeinWeightGrams),
  ]
    .filter(Boolean)
    .forEach((detail) => details.append(createChip(detail)));
  if (details.childElementCount) content.append(details);

  const projects = projectNames(yarn.projects);
  if (projects.length) {
    const projectContainer = document.createElement("div");
    projectContainer.className = "yarn-projects";
    projects.forEach((project) => projectContainer.append(createChip(project, "project-chip")));
    content.append(projectContainer);
  }

  button.append(content);
  card.append(button);
  return card;
}

function render() {
  const query = searchInput.value.trim().toLocaleLowerCase("nl");
  const sortBy = sortSelect.value;
  const filtered = yarns
    .filter((yarn) => [
      yarn.name, yarn.brand, yarn.color, displayColorName(yarn.color), yarn.weight, yarn.fiber,
      formatSkeinWeightGrams(yarn.skeinWeightGrams), ...projectNames(yarn.projects),
    ].some((value) => text(value).toLocaleLowerCase("nl").includes(query)))
    .sort((a, b) => sortBy === "quantity"
      ? b.quantity - a.quantity || a.name.localeCompare(b.name, "nl")
      : text(a[sortBy]).localeCompare(text(b[sortBy]), "nl"));

  yarnList.replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const title = document.createElement("strong");
    const message = document.createElement("p");
    if (yarns.length === 0) {
      title.textContent = "Je voorraad begint hier";
      message.textContent = "Voeg je eerste garen toe en houd bij wat je in huis hebt.";
    } else {
      title.textContent = "Geen garen gevonden";
      message.textContent = "Probeer een andere zoekterm.";
    }
    empty.append(title, message);
    yarnList.append(empty);
  } else {
    filtered.forEach((yarn) => yarnList.append(createYarnCard(yarn)));
  }

  const projectCount = new Set(yarns.flatMap((yarn) => projectNames(yarn.projects).map((name) => name.toLocaleLowerCase("nl")))).size;
  document.querySelector("#total-skeins").textContent = String(yarns.reduce((sum, yarn) => sum + yarn.quantity, 0));
  document.querySelector("#total-yarns").textContent = String(yarns.length);
  document.querySelector("#total-projects").textContent = String(projectCount);
  document.querySelector("#inventory-count").textContent = `${filtered.length} ${filtered.length === 1 ? "item" : "items"}`;
}

function setViewMode(mode) {
  viewMode = mode;
  const isList = viewMode === "list";
  yarnList.classList.toggle("is-list", isList);
  thumbnailViewButton.setAttribute("aria-pressed", String(!isList));
  listViewButton.setAttribute("aria-pressed", String(isList));
}

function setTheme(theme) {
  const isLight = theme === "light";
  document.body.dataset.theme = isLight ? "light" : "dark";
  themeToggleButton.setAttribute("aria-label", `Schakel naar ${isLight ? "donkere" : "lichte"} modus`);
  themeToggleIcon.textContent = isLight ? "☾" : "☼";
  themeToggleLabel.textContent = isLight ? "Donkere modus" : "Lichte modus";
  document.querySelector('meta[name="theme-color"]').content = isLight ? "#f7f5ef" : "#141b18";
}

function resetForm() {
  form.reset();
  form.elements.quantity.value = "1";
  selectedId = null;
  selectedColorHex = colorPicker.value;
  saveButton.textContent = "Garen opslaan";
  deleteButton.hidden = true;
}

function selectYarn(id) {
  const yarn = yarns.find((item) => item.id === id);
  if (!yarn) return;
  selectedId = yarn.id;
  form.elements.name.value = yarn.name;
  form.elements.brand.value = yarn.brand;
  form.elements.color.value = displayColorName(yarn.color);
  selectedColorHex = yarnColorHex(yarn);
  colorPicker.value = selectedColorHex || DEFAULT_COLOR;
  form.elements.weight.value = yarn.weight;
  form.elements.fiber.value = yarn.fiber;
  form.elements.lengthMeters.value = yarn.lengthMeters ?? "";
  form.elements.skeinWeightGrams.value = yarn.skeinWeightGrams ?? "";
  form.elements.quantity.value = String(yarn.quantity);
  form.elements.projects.value = projectNames(yarn.projects).join(", ");
  saveButton.textContent = "Wijzigingen opslaan";
  deleteButton.hidden = false;
  document.querySelector("#form-title").textContent = "Garen bewerken";
  document.querySelector("#name").focus();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const quantity = Number(form.elements.quantity.value);
  const lengthInput = form.elements.lengthMeters.value;
  const lengthMeters = lengthInput === "" ? null : Number(lengthInput);
  const skeinWeightInput = form.elements.skeinWeightGrams.value;
  const skeinWeightGrams = skeinWeightInput === "" ? null : Number(skeinWeightInput);
  const name = text(form.elements.name.value);
  if (!name) {
    form.elements.name.setCustomValidity("Vul een garennaam in.");
    form.elements.name.reportValidity();
    form.elements.name.setCustomValidity("");
    return;
  }
  if (!Number.isInteger(quantity) || quantity < 0 || (lengthMeters !== null && (!Number.isFinite(lengthMeters) || lengthMeters < 0))) {
    showToast("Controleer het aantal bollen en de garenlengte.", true);
    return;
  }
  if (skeinWeightGrams !== null && (!Number.isFinite(skeinWeightGrams) || skeinWeightGrams < 0)) {
    showToast("Het gewicht per bol moet nul of hoger zijn.", true);
    return;
  }

  const previous = yarns.find((yarn) => yarn.id === selectedId);
  const record = {
    ...(previous || {}),
    name,
    brand: text(form.elements.brand.value),
    color: text(form.elements.color.value),
    colorHex: text(form.elements.color.value) ? selectedColorHex : null,
    weight: text(form.elements.weight.value),
    fiber: text(form.elements.fiber.value),
    lengthMeters,
    skeinWeightGrams,
    quantity,
    projects: projectNames(form.elements.projects.value),
  };
  if (selectedId !== null) record.id = selectedId;

  try {
    await transact("readwrite", (store) => store.put(record));
    yarns = await loadYarns();
    resetForm();
    document.querySelector("#form-title").textContent = "Garen toevoegen";
    render();
    showToast(previous ? "Je garen is bijgewerkt." : "Garen toegevoegd aan je voorraad.");
  } catch (error) {
    showToast(`Opslaan is niet gelukt: ${error.message}`, true);
  }
});

document.querySelector("#new-button").addEventListener("click", () => {
  resetForm();
  document.querySelector("#form-title").textContent = "Garen toevoegen";
  document.querySelector("#name").focus();
});

deleteButton.addEventListener("click", async () => {
  const yarn = yarns.find((item) => item.id === selectedId);
  if (!yarn || !window.confirm(`Weet je zeker dat je "${yarn.name}" wilt verwijderen?`)) return;
  try {
    await transact("readwrite", (store) => store.delete(selectedId));
    yarns = await loadYarns();
    resetForm();
    document.querySelector("#form-title").textContent = "Garen toevoegen";
    render();
    showToast("Garen verwijderd uit je voorraad.");
  } catch (error) {
    showToast(`Verwijderen is niet gelukt: ${error.message}`, true);
  }
});

searchInput.addEventListener("input", render);
sortSelect.addEventListener("change", render);
colorPicker.addEventListener("input", () => {
  selectedColorHex = colorPicker.value.toLowerCase();
  colorInput.value = nearestNamedColor(selectedColorHex).name;
});
function syncColorFromText() {
  const value = text(colorInput.value);
  const named = findNamedColor(value);
  if (named) {
    colorInput.value = named.name;
    colorPicker.value = named.hex;
    selectedColorHex = named.hex;
  } else if (isHexColor(value)) {
    colorPicker.value = value.toLowerCase();
    selectedColorHex = colorPicker.value;
    colorInput.value = nearestNamedColor(selectedColorHex).name;
  } else {
    selectedColorHex = null;
  }
}
colorInput.addEventListener("input", syncColorFromText);
colorInput.addEventListener("change", syncColorFromText);
thumbnailViewButton.addEventListener("click", () => setViewMode("thumbnails"));
listViewButton.addEventListener("click", () => setViewMode("list"));
themeToggleButton.addEventListener("click", () => {
  const nextTheme = document.body.dataset.theme === "light" ? "dark" : "light";
  setTheme(nextTheme);
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
});
populateColorSuggestions();
setViewMode(viewMode);
setTheme(localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark");

document.querySelector("#export-button").addEventListener("click", () => {
  const backup = {
    format: BACKUP_FORMAT,
    version: 2,
    exportedAt: new Date().toISOString(),
    yarns: yarns.map((yarn) => ({
      name: yarn.name,
      brand: yarn.brand,
      color: displayColorName(yarn.color),
      colorHex: yarnColorHex(yarn),
      weight: yarn.weight,
      fiber: yarn.fiber,
      lengthMeters: yarn.lengthMeters ?? null,
      skeinWeightGrams: yarn.skeinWeightGrams ?? null,
      quantity: yarn.quantity,
      projects: projectNames(yarn.projects),
    })),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `wolhalla-back-up-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Je back-up is gedownload.");
});

document.querySelector("#import-button").addEventListener("click", () => {
  document.querySelector("#import-file").click();
});

document.querySelector("#import-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    if (backup.format !== BACKUP_FORMAT || ![1, 2].includes(backup.version) || !Array.isArray(backup.yarns)) {
      throw new Error("Dit is geen geldige Wolhalla-back-up.");
    }
    const imported = backup.yarns.map((item) => {
      const quantity = Number(item.quantity);
      const color = displayColorName(item.color);
      const colorHex = item.colorHex == null || item.colorHex === ""
        ? yarnColorHex({ color: item.color })
        : text(item.colorHex).toLowerCase();
      const rawLength = backup.version === 1 ? item.yardage : item.lengthMeters;
      const lengthMeters = rawLength == null || rawLength === ""
        ? null
        : backup.version === 1 ? yardsToMeters(rawLength) : Number(rawLength);
      const rawSkeinWeight = item.skeinWeightGrams;
      const skeinWeightGrams = rawSkeinWeight == null || rawSkeinWeight === ""
        ? null
        : Number(rawSkeinWeight);
      if (!text(item.name) || !Number.isInteger(quantity) || quantity < 0
        || (colorHex !== null && !isHexColor(colorHex))
        || (skeinWeightGrams !== null && (!Number.isFinite(skeinWeightGrams) || skeinWeightGrams < 0))
        || (lengthMeters !== null && (!Number.isFinite(lengthMeters) || lengthMeters < 0))) {
        throw new Error("De back-up bevat garengegevens die niet geldig zijn.");
      }
      return {
        name: text(item.name),
        brand: text(item.brand),
        color,
        colorHex,
        weight: text(item.weight),
        fiber: text(item.fiber),
        lengthMeters,
        skeinWeightGrams,
        quantity,
        projects: projectNames(Array.isArray(item.projects) ? item.projects.join(", ") : item.projects),
      };
    });
    const itemLabel = imported.length === 1 ? "item" : "items";
    if (!window.confirm(`Deze back-up bevat ${imported.length} ${itemLabel} en vervangt je huidige voorraad. Doorgaan?`)) return;
    await transact("readwrite", (store) => {
      store.clear();
      imported.forEach((item) => store.add(item));
    });
    yarns = await loadYarns();
    resetForm();
    document.querySelector("#form-title").textContent = "Garen toevoegen";
    render();
    showToast(`${imported.length} items geïmporteerd.`);
  } catch (error) {
    showToast(`Importeren is niet gelukt: ${error.message}`, true);
  }
});

async function start() {
  try {
    yarns = await loadYarns();
    render();
  } catch (error) {
    yarnList.replaceChildren();
    showToast(`Wolhalla kan de browseropslag niet openen: ${error.message}`, true);
  }
}

start();
