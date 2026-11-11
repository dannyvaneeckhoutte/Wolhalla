const DATABASE_NAME = "wolhalla-web";
const DATABASE_VERSION = 2;
const STORE_NAME = "yarns";
const DEFAULT_COLOR = "#355747";
const DEMO_YARNS = [
  {
    id: "demo-merino",
    isDemo: true,
    name: "Merino Soft",
    brand: "Lang Yarns",
    color: "Okergeel",
    colorHex: "#b4823b",
    weight: "DK",
    fiber: "100% merinowol",
    lengthMeters: 120,
    skeinWeightGrams: 50,
    quantity: 3,
    location: "Garage - Bruine Kast, vak 1",
    projects: ["Herfstsjaal"],
  },
  {
    id: "demo-cotton",
    isDemo: true,
    name: "Cotton 8/4",
    brand: "Scheepjes",
    color: "Lichtblauw",
    colorHex: "#6d9db3",
    weight: "Fingering",
    fiber: "100% katoen",
    lengthMeters: 170,
    skeinWeightGrams: 50,
    quantity: 4,
    location: "Living - Kast aan raam, vak 2",
    projects: ["Gehaakte tas"],
  },
  {
    id: "demo-alpaca",
    isDemo: true,
    name: "Alpaca Blend",
    brand: "Drops",
    color: "Zachtroze",
    colorHex: "#bb818a",
    weight: "Aran",
    fiber: "70% alpaca, 30% zijde",
    lengthMeters: 140,
    skeinWeightGrams: 50,
    quantity: 2,
    location: "Garage - Bruine Kast, vak 3",
    projects: ["Lentevest"],
  },
  {
    id: "demo-mohair",
    isDemo: true,
    name: "Mohair Luxe",
    brand: "Lang Yarns",
    color: "Saliegroen",
    colorHex: "#83947b",
    weight: "Lace",
    fiber: "77% mohair, 23% zijde",
    lengthMeters: 210,
    skeinWeightGrams: 25,
    quantity: 5,
    location: "Living - Kast aan raam, vak 3",
    projects: ["Lichte omslagdoek"],
  },
  {
    id: "demo-wool",
    isDemo: true,
    name: "Everyday Wool",
    brand: "Katia",
    color: "Pruim",
    colorHex: "#765b79",
    weight: "Worsted",
    fiber: "80% wol, 20% polyamide",
    lengthMeters: 100,
    skeinWeightGrams: 50,
    quantity: 1,
    location: "Garage - Bruine Kast, vak 4",
    projects: [],
  },
];
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
const LOCATION_OPTIONS = new Set(
  Array.from(form.elements.location.options, (option) => option.value).filter(Boolean),
);
const yarnList = document.querySelector("#yarn-list");
const tableFrame = document.querySelector("#table-frame");
const yarnRows = document.querySelector("#yarn-rows");
const searchInput = document.querySelector("#search");
const sortSelect = document.querySelector("#sort");
const locationFilter = document.querySelector("#location-filter");
const colorInput = document.querySelector("#color");
const colorPicker = document.querySelector("#color-picker");
const thumbnailViewButton = document.querySelector("#thumbnail-view");
const listViewButton = document.querySelector("#list-view");
const themeToggleButton = document.querySelector("#theme-toggle");
const themeToggleIcon = document.querySelector("#theme-toggle-icon");
const themeToggleLabel = document.querySelector("#theme-toggle-label");
const saveButton = document.querySelector("#save-button");
const deleteButton = document.querySelector("#delete-button");
const yarnDialog = document.querySelector("#yarn-dialog");
const toast = document.querySelector("#toast");

let yarns = [];
let isDemoMode = false;
let selectedId = null;
let editingId = null;
let selectedColorHex = DEFAULT_COLOR;
let viewMode = "list";
let toastTimer;

function useInventory(records) {
  isDemoMode = records.length === 0;
  yarns = isDemoMode ? DEMO_YARNS : records;
}

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
    transaction.oncomplete = () => resolve(
      result && typeof result === "object" && "result" in result ? result.result : result,
    );
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
  card.className = `yarn-card${yarn.id === selectedId ? " is-selected" : ""}`;
  card.dataset.yarnId = yarn.id;

  const button = document.createElement("button");
  button.className = "card-select";
  button.type = "button";
  button.setAttribute("aria-label", `Bekijk ${yarn.name}`);
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
    yarn.location,
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

function addDetailLine(container, label, value) {
  const line = document.createElement("div");
  const name = document.createElement("span");
  const detail = document.createElement("strong");
  name.textContent = label;
  detail.textContent = value || "—";
  line.append(name, detail);
  container.append(line);
}

function createResponsiveDetails(yarn, includeTableDetails = true) {
  const details = document.createElement("div");
  details.className = "mobile-detail-content";
  if (includeTableDetails) {
    addDetailLine(details, "Samenstelling", yarn.fiber);
    addDetailLine(details, "Garendikte", yarn.weight);
    addDetailLine(details, "Lengte per bol", formatLengthMeters(yarn.lengthMeters));
    addDetailLine(details, "Gewicht per bol", formatSkeinWeightGrams(yarn.skeinWeightGrams));
    addDetailLine(details, "Bewaarlocatie", yarn.location);
  }
  const projects = document.createElement("div");
  projects.className = "mobile-projects";
  const projectLabel = document.createElement("span");
  const projectNamesLabel = document.createElement("span");
  projectLabel.textContent = "Projecten";
  projectNamesLabel.textContent = projectNames(yarn.projects).join(", ") || "—";
  projects.append(projectLabel, projectNamesLabel);
  details.append(projects);

  const actions = document.createElement("div");
  actions.className = "mobile-detail-actions";
  const edit = document.createElement("button");
  edit.className = "button button-primary";
  edit.type = "button";
  edit.textContent = "Garen bewerken";
  edit.addEventListener("click", (event) => {
    event.stopPropagation();
    openForm(yarn.id);
  });
  actions.append(edit);
  details.append(actions);
  return details;
}

function createTableRow(yarn) {
  const row = document.createElement("tr");
  const isSelected = yarn.id === selectedId;
  row.className = `yarn-row${isSelected ? " is-selected is-expanded" : ""}`;
  row.dataset.yarnId = yarn.id;
  row.tabIndex = 0;
  row.setAttribute("aria-selected", String(isSelected));
  row.addEventListener("click", () => selectYarn(yarn.id));
  row.addEventListener("keydown", (event) => {
    if (event.target !== row) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectYarn(yarn.id);
    }
  });

  const nameCell = document.createElement("td");
  nameCell.dataset.label = "Garen / merk";
  nameCell.dataset.column = "yarn";
  const name = document.createElement("span");
  name.className = "yarn-name";
  name.textContent = yarn.name;
  const brand = document.createElement("span");
  brand.className = "yarn-brand";
  brand.textContent = yarn.brand || "Merk onbekend";
  nameCell.append(name, brand);

  const fiberCell = document.createElement("td");
  fiberCell.dataset.label = "Samenstelling";
  fiberCell.dataset.column = "fiber";
  fiberCell.textContent = yarn.fiber || "—";

  const weightCell = document.createElement("td");
  weightCell.dataset.label = "Garendikte";
  weightCell.dataset.column = "weight";
  weightCell.textContent = yarn.weight || "—";

  const lengthCell = document.createElement("td");
  lengthCell.className = "length-cell";
  lengthCell.dataset.label = "Lengte / gewicht";
  lengthCell.dataset.column = "length";
  const length = document.createElement("span");
  length.textContent = formatLengthMeters(yarn.lengthMeters) || "—";
  const skeinWeight = document.createElement("span");
  skeinWeight.className = "subtle";
  skeinWeight.textContent = formatSkeinWeightGrams(yarn.skeinWeightGrams) || "—";
  lengthCell.append(length, skeinWeight);

  const colorCell = document.createElement("td");
  colorCell.dataset.label = "Kleur";
  colorCell.dataset.column = "color";
  const color = document.createElement("span");
  color.className = "color-cell";
  const swatch = document.createElement("span");
  swatch.className = "color-dot";
  swatch.setAttribute("aria-hidden", "true");
  const swatchColor = yarnColorHex(yarn);
  if (swatchColor) swatch.style.setProperty("--swatch", swatchColor);
  const colorName = document.createElement("span");
  colorName.textContent = displayColorName(yarn.color) || "—";
  color.append(swatch, colorName);
  colorCell.append(color);

  const locationCell = document.createElement("td");
  locationCell.className = "location-cell";
  locationCell.dataset.label = "Bewaarlocatie";
  locationCell.dataset.column = "location";
  locationCell.textContent = yarn.location || "—";

  const quantityCell = document.createElement("td");
  quantityCell.className = "quantity-column";
  quantityCell.dataset.label = "Bollen";
  quantityCell.dataset.column = "quantity";
  const quantity = document.createElement("span");
  quantity.className = "quantity-pill";
  quantity.textContent = String(yarn.quantity);
  quantityCell.append(quantity);

  const mobileSummaryCell = document.createElement("td");
  mobileSummaryCell.dataset.column = "mobile-summary";
  const mobileSummary = document.createElement("div");
  mobileSummary.className = "mobile-summary";
  const mobileColor = document.createElement("div");
  mobileColor.className = "mobile-summary-color";
  const mobileSwatch = document.createElement("span");
  mobileSwatch.className = "color-dot";
  mobileSwatch.setAttribute("aria-hidden", "true");
  mobileSwatch.style.setProperty("--swatch", swatchColor || "transparent");
  const mobileColorText = document.createElement("div");
  const mobileColorName = document.createElement("strong");
  mobileColorName.textContent = displayColorName(yarn.color) || "—";
  mobileColorText.append(mobileColorName);
  mobileColor.append(mobileSwatch, mobileColorText);

  const mobileQuantity = document.createElement("div");
  mobileQuantity.className = "mobile-summary-quantity";
  const mobileQuantityLabel = document.createElement("span");
  mobileQuantityLabel.textContent = "Bollen";
  const mobileQuantityPill = document.createElement("span");
  mobileQuantityPill.className = "quantity-pill";
  mobileQuantityPill.textContent = String(yarn.quantity);
  mobileQuantity.append(mobileQuantityLabel, mobileQuantityPill);
  mobileSummary.append(mobileColor, mobileQuantity);
  mobileSummaryCell.append(mobileSummary);

  const mobileDetailsCell = document.createElement("td");
  mobileDetailsCell.dataset.column = "details";
  mobileDetailsCell.setAttribute("aria-hidden", String(!isSelected));
  mobileDetailsCell.inert = !isSelected;
  const mobileDetailsReveal = document.createElement("div");
  mobileDetailsReveal.className = "mobile-details-reveal";
  mobileDetailsReveal.append(createResponsiveDetails(yarn));
  mobileDetailsCell.append(mobileDetailsReveal);
  mobileDetailsCell.addEventListener("click", (event) => event.stopPropagation());

  row.append(nameCell, fiberCell, weightCell, lengthCell, colorCell, locationCell, quantityCell, mobileSummaryCell, mobileDetailsCell);

  const responsiveRow = document.createElement("tr");
  responsiveRow.className = "responsive-details-row";
  responsiveRow.hidden = yarn.id !== selectedId;
  const responsiveCell = document.createElement("td");
  responsiveCell.colSpan = 7;
  responsiveCell.append(createResponsiveDetails(yarn, false));
  responsiveRow.append(responsiveCell);
  return [row, responsiveRow];
}

function updateLocationOptions() {
  const currentValue = locationFilter.value;
  const locations = Array.from(new Set(yarns.map((yarn) => text(yarn.location)).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, "nl"));
  const options = [new Option("Alle locaties", ""), ...locations.map((location) => new Option(location, location))];
  locationFilter.replaceChildren(...options);
  if (locations.includes(currentValue)) locationFilter.value = currentValue;
}

function updateDetailsPanel() {
  const yarn = yarns.find((item) => item.id === selectedId);
  const setText = (selector, value) => {
    document.querySelector(selector).textContent = value || "—";
  };
  const editButton = document.querySelector("#edit-selected-button");
  editButton.disabled = !yarn;
  editButton.textContent = "Garen bewerken";
  document.querySelector("#detail-title").textContent = yarn?.name || "Selecteer een garen";
  setText("#detail-brand", yarn?.brand || (yarn ? "Merk onbekend" : ""));
  setText("#detail-color", yarn ? displayColorName(yarn.color) : "");
  setText("#detail-fiber", yarn?.fiber);
  setText("#detail-weight", yarn?.weight);
  setText("#detail-length", formatLengthMeters(yarn?.lengthMeters));
  setText("#detail-skein-weight", formatSkeinWeightGrams(yarn?.skeinWeightGrams));
  setText("#detail-location", yarn?.location);
  setText("#detail-quantity", yarn ? String(yarn.quantity) : "");
  setText("#detail-projects", yarn ? projectNames(yarn.projects).join(", ") : "");

  const swatch = document.querySelector("#detail-swatch");
  const color = yarn ? yarnColorHex(yarn) : null;
  swatch.style.setProperty("--swatch", color || "transparent");
  document.querySelector("#projects-row").hidden = !yarn || projectNames(yarn.projects).length === 0;
  document.querySelector("#collection-note").textContent = isDemoMode
    ? "Voorbeeldgarens — niets opgeslagen"
    : "Je voorraad blijft op dit apparaat";
}

function render() {
  const query = searchInput.value.trim().toLocaleLowerCase("nl");
  const sortBy = sortSelect.value;
  updateLocationOptions();
  const filtered = yarns
    .filter((yarn) => !locationFilter.value || text(yarn.location) === locationFilter.value)
    .filter((yarn) => [
      yarn.name, yarn.brand, yarn.color, displayColorName(yarn.color), yarn.weight, yarn.fiber,
      formatLengthMeters(yarn.lengthMeters), formatSkeinWeightGrams(yarn.skeinWeightGrams),
      yarn.location, ...projectNames(yarn.projects),
    ].some((value) => text(value).toLocaleLowerCase("nl").includes(query)))
    .sort((a, b) => {
      const nameOrder = a.name.localeCompare(b.name, "nl");
      if (["quantity", "lengthMeters", "skeinWeightGrams"].includes(sortBy)) {
        const left = a[sortBy] == null || a[sortBy] === "" ? null : Number(a[sortBy]);
        const right = b[sortBy] == null || b[sortBy] === "" ? null : Number(b[sortBy]);
        if (left === null || !Number.isFinite(left)) {
          return right === null || !Number.isFinite(right) ? nameOrder : 1;
        }
        if (right === null || !Number.isFinite(right)) return -1;
        const direction = sortBy === "quantity" ? -1 : 1;
        return direction * (left - right) || nameOrder;
      }

      const value = (yarn) => {
        if (sortBy === "color") return displayColorName(yarn.color);
        if (sortBy === "projects") return projectNames(yarn.projects).join(", ");
        return yarn[sortBy];
      };
      return text(value(a)).localeCompare(text(value(b)), "nl") || nameOrder;
    });

  if (selectedId !== null && !filtered.some((yarn) => yarn.id === selectedId)) selectedId = null;
  updateDetailsPanel();
  yarnRows.replaceChildren();
  if (!filtered.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.className = "empty-row";
    cell.colSpan = 7;
    cell.textContent = yarns.length === 0
      ? "Je voorraad begint hier. Voeg je eerste garen toe."
      : "Geen garen gevonden. Probeer een andere zoekterm of locatie.";
    row.append(cell);
    yarnRows.append(row);
  } else {
    filtered.forEach((yarn) => yarnRows.append(...createTableRow(yarn)));
  }

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

  const fibers = new Set(yarns.map((yarn) => text(yarn.fiber).toLocaleLowerCase("nl")).filter(Boolean));
  const brands = new Set(yarns.map((yarn) => text(yarn.brand).toLocaleLowerCase("nl")).filter(Boolean));
  document.querySelector("#total-skeins").textContent = String(yarns.reduce((sum, yarn) => sum + yarn.quantity, 0));
  document.querySelector("#total-yarns").textContent = String(yarns.length);
  document.querySelector("#total-fibers").textContent = String(fibers.size);
  document.querySelector("#total-brands").textContent = String(brands.size);
  document.querySelector("#inventory-count").textContent = String(filtered.length);
  document.querySelector("#results-label").textContent =
    `${filtered.length} van ${yarns.length} ${yarns.length === 1 ? "garen" : "garens"}`;
  tableFrame.hidden = viewMode !== "list";
  yarnList.hidden = viewMode === "list";
}

function setViewMode(mode) {
  viewMode = mode;
  const isList = viewMode === "list";
  tableFrame.hidden = !isList;
  yarnList.hidden = isList;
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
  editingId = null;
  selectedColorHex = colorPicker.value;
  saveButton.textContent = "Garen opslaan";
  deleteButton.hidden = true;
}

function selectYarn(id) {
  const yarn = yarns.find((item) => item.id === id);
  if (!yarn) return;
  const isCompact = window.matchMedia("(max-width: 900px)").matches;
  selectedId = isCompact && selectedId === yarn.id ? null : yarn.id;
  updateSelection();
}

function updateSelection() {
  const selectedKey = String(selectedId);
  yarnRows.querySelectorAll(".yarn-row").forEach((row) => {
    const isSelected = row.dataset.yarnId === selectedKey;
    row.classList.toggle("is-selected", isSelected);
    row.classList.toggle("is-expanded", isSelected);
    row.setAttribute("aria-selected", String(isSelected));
    const details = row.querySelector('[data-column="details"]');
    if (details) {
      details.setAttribute("aria-hidden", String(!isSelected));
      details.inert = !isSelected;
    }
    const responsiveRow = row.nextElementSibling;
    if (responsiveRow?.classList.contains("responsive-details-row")) {
      responsiveRow.hidden = !isSelected;
    }
  });
  yarnList.querySelectorAll(".yarn-card").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.yarnId === selectedKey);
  });
  updateDetailsPanel();
}

function openForm(id = null) {
  resetForm();
  const yarn = id === null ? null : yarns.find((item) => item.id === id);
  if (yarn) {
    const isDemoYarn = Boolean(yarn.isDemo);
    if (!isDemoYarn) editingId = yarn.id;
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
    form.elements.location.value = yarn.location ?? "";
    form.elements.projects.value = projectNames(yarn.projects).join(", ");
    saveButton.textContent = isDemoYarn ? "Aan mijn voorraad toevoegen" : "Wijzigingen opslaan";
    deleteButton.hidden = isDemoYarn;
    document.querySelector("#form-title").textContent = isDemoYarn ? "Voorbeeld overnemen" : "Garen bewerken";
  } else {
    document.querySelector("#form-title").textContent = "Garen toevoegen";
  }
  yarnDialog.showModal();
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

  const previous = yarns.find((yarn) => yarn.id === editingId);
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
    location: text(form.elements.location.value),
    projects: projectNames(form.elements.projects.value),
  };
  if (editingId !== null) record.id = editingId;

  try {
    const savedId = await transact("readwrite", (store) => store.put(record));
    useInventory(await loadYarns());
    selectedId = savedId;
    resetForm();
    yarnDialog.close();
    render();
    showToast(previous ? "Je garen is bijgewerkt." : "Garen toegevoegd aan je voorraad.");
  } catch (error) {
    showToast(`Opslaan is niet gelukt: ${error.message}`, true);
  }
});

deleteButton.addEventListener("click", async () => {
  const yarn = yarns.find((item) => item.id === editingId);
  if (!yarn || !window.confirm(`Weet je zeker dat je "${yarn.name}" wilt verwijderen?`)) return;
  try {
    await transact("readwrite", (store) => store.delete(editingId));
    useInventory(await loadYarns());
    selectedId = null;
    resetForm();
    yarnDialog.close();
    render();
    showToast("Garen verwijderd uit je voorraad.");
  } catch (error) {
    showToast(`Verwijderen is niet gelukt: ${error.message}`, true);
  }
});

searchInput.addEventListener("input", render);
sortSelect.addEventListener("change", render);
locationFilter.addEventListener("change", render);
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase("nl") === "k") {
    event.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
});
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
document.querySelector("#add-yarn-button").addEventListener("click", () => openForm());
document.querySelector("#edit-selected-button").addEventListener("click", () => {
  if (selectedId !== null) openForm(selectedId);
});
document.querySelector("#close-form").addEventListener("click", () => {
  resetForm();
  yarnDialog.close();
});
document.querySelector("#new-button").addEventListener("click", () => {
  resetForm();
  yarnDialog.close();
});
yarnDialog.addEventListener("close", resetForm);
yarnDialog.addEventListener("click", (event) => {
  if (event.target === yarnDialog) yarnDialog.close();
});
themeToggleButton.addEventListener("click", () => {
  const nextTheme = document.body.dataset.theme === "light" ? "dark" : "light";
  setTheme(nextTheme);
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
});
populateColorSuggestions();
setViewMode(viewMode);
setTheme(localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark");

document.querySelector("#export-button").addEventListener("click", () => {
  const savedYarns = yarns.filter((yarn) => !yarn.isDemo);
  const backup = {
    format: BACKUP_FORMAT,
    version: 2,
    exportedAt: new Date().toISOString(),
    yarns: savedYarns.map((yarn) => ({
      name: yarn.name,
      brand: yarn.brand,
      color: displayColorName(yarn.color),
      colorHex: yarnColorHex(yarn),
      weight: yarn.weight,
      fiber: yarn.fiber,
      lengthMeters: yarn.lengthMeters ?? null,
      skeinWeightGrams: yarn.skeinWeightGrams ?? null,
      quantity: yarn.quantity,
      location: yarn.location ?? "",
      projects: projectNames(yarn.projects),
    })),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `wolhalla-back-up-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(isDemoMode
    ? "Een lege back-up is gedownload; voorbeeldgarens zijn niet opgenomen."
    : "Je back-up is gedownload.");
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
      if (item.location != null && typeof item.location !== "string") {
        throw new Error("De back-up bevat een onbekende bewaarlocatie.");
      }
      const location = text(item.location);
      if (location && !LOCATION_OPTIONS.has(location)) {
        throw new Error("De back-up bevat een onbekende bewaarlocatie.");
      }
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
        location,
        projects: projectNames(Array.isArray(item.projects) ? item.projects.join(", ") : item.projects),
      };
    });
    const itemLabel = imported.length === 1 ? "item" : "items";
    const replacementMessage = isDemoMode
      ? "De voorbeeldgarens zijn niet opgeslagen."
      : "Je huidige voorraad wordt vervangen.";
    if (!window.confirm(`Deze back-up bevat ${imported.length} ${itemLabel}. ${replacementMessage} Doorgaan?`)) return;
    await transact("readwrite", (store) => {
      store.clear();
      imported.forEach((item) => store.add(item));
    });
    useInventory(await loadYarns());
    selectedId = null;
    resetForm();
    render();
    showToast(imported.length === 0 && isDemoMode
      ? "Lege back-up geïmporteerd; de voorbeeldgarens zijn niet opgeslagen."
      : `${imported.length} items geïmporteerd.`);
  } catch (error) {
    showToast(`Importeren is niet gelukt: ${error.message}`, true);
  }
});

async function start() {
  try {
    useInventory(await loadYarns());
    render();
  } catch (error) {
    yarnList.replaceChildren();
    yarnRows.replaceChildren();
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.className = "empty-row";
    cell.colSpan = 7;
    cell.textContent = "De browseropslag kon niet worden geopend.";
    row.append(cell);
    yarnRows.append(row);
    showToast(`Wolhalla kan de browseropslag niet openen: ${error.message}`, true);
  }
}

start();
