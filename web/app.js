const DATABASE_NAME = "wolhalla-web";
const DATABASE_VERSION = 1;
const STORE_NAME = "yarns";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const BACKUP_FORMAT = "wolhalla-backup";

const form = document.querySelector("#yarn-form");
const yarnList = document.querySelector("#yarn-list");
const searchInput = document.querySelector("#search");
const sortSelect = document.querySelector("#sort");
const fileInput = document.querySelector("#photo");
const photoPreview = document.querySelector("#photo-preview");
const saveButton = document.querySelector("#save-button");
const deleteButton = document.querySelector("#delete-button");
const toast = document.querySelector("#toast");

let yarns = [];
let selectedId = null;
let selectedPhoto = null;
let toastTimer;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
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

function formatYardage(value) {
  if (value === null || value === undefined || value === "") return "";
  const amount = Number(value);
  return Number.isFinite(amount) ? `${new Intl.NumberFormat("nl-NL").format(amount)} yd` : "";
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

  if (yarn.photoData) {
    const image = document.createElement("img");
    image.className = "yarn-photo";
    image.src = yarn.photoData;
    image.alt = `Foto van ${yarn.name}`;
    button.append(image);
  } else {
    const placeholder = document.createElement("span");
    placeholder.className = "yarn-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.textContent = "w";
    button.append(placeholder);
  }

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
  [yarn.color, yarn.weight, yarn.fiber, formatYardage(yarn.yardage)]
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
      yarn.name, yarn.brand, yarn.color, yarn.weight, yarn.fiber, ...projectNames(yarn.projects),
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

function updatePhotoPreview() {
  photoPreview.replaceChildren();
  photoPreview.hidden = !selectedPhoto;
  if (!selectedPhoto) return;

  const image = document.createElement("img");
  image.src = selectedPhoto;
  image.alt = "Geselecteerde garenfoto";
  const label = document.createElement("span");
  label.textContent = "Foto toegevoegd";
  photoPreview.append(image, label);
}

function resetForm() {
  form.reset();
  form.elements.quantity.value = "1";
  selectedId = null;
  selectedPhoto = null;
  saveButton.textContent = "Garen opslaan";
  deleteButton.hidden = true;
  updatePhotoPreview();
}

function selectYarn(id) {
  const yarn = yarns.find((item) => item.id === id);
  if (!yarn) return;
  selectedId = yarn.id;
  selectedPhoto = yarn.photoData || null;
  form.elements.name.value = yarn.name;
  form.elements.brand.value = yarn.brand;
  form.elements.color.value = yarn.color;
  form.elements.weight.value = yarn.weight;
  form.elements.fiber.value = yarn.fiber;
  form.elements.yardage.value = yarn.yardage ?? "";
  form.elements.quantity.value = String(yarn.quantity);
  form.elements.projects.value = projectNames(yarn.projects).join(", ");
  fileInput.value = "";
  saveButton.textContent = "Wijzigingen opslaan";
  deleteButton.hidden = false;
  updatePhotoPreview();
  document.querySelector("#form-title").textContent = "Garen bewerken";
  document.querySelector("#name").focus();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const quantity = Number(form.elements.quantity.value);
  const yardageInput = form.elements.yardage.value;
  const yardage = yardageInput === "" ? null : Number(yardageInput);
  const name = text(form.elements.name.value);
  if (!name) {
    form.elements.name.setCustomValidity("Vul een garennaam in.");
    form.elements.name.reportValidity();
    form.elements.name.setCustomValidity("");
    return;
  }
  if (!Number.isInteger(quantity) || quantity < 0 || (yardage !== null && (!Number.isFinite(yardage) || yardage < 0))) {
    showToast("Controleer het aantal bollen en de garenlengte.", true);
    return;
  }

  const previous = yarns.find((yarn) => yarn.id === selectedId);
  const record = {
    ...(previous || {}),
    name,
    brand: text(form.elements.brand.value),
    color: text(form.elements.color.value),
    weight: text(form.elements.weight.value),
    fiber: text(form.elements.fiber.value),
    yardage,
    quantity,
    projects: projectNames(form.elements.projects.value),
    photoData: selectedPhoto,
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

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    fileInput.value = "";
    showToast("Kies een afbeeldingsbestand.", true);
    return;
  }
  if (file.size > MAX_PHOTO_BYTES) {
    fileInput.value = "";
    showToast("Deze foto is groter dan 5 MB.", true);
    return;
  }

  try {
    selectedPhoto = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("De foto kon niet worden gelezen."));
      reader.readAsDataURL(file);
    });
    updatePhotoPreview();
  } catch (error) {
    showToast(`De foto kon niet worden geladen: ${error.message}`, true);
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

document.querySelector("#export-button").addEventListener("click", () => {
  const backup = {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    yarns,
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
    if (backup.format !== BACKUP_FORMAT || backup.version !== 1 || !Array.isArray(backup.yarns)) {
      throw new Error("Dit is geen geldige Wolhalla-back-up.");
    }
    const imported = backup.yarns.map((item) => {
      const quantity = Number(item.quantity);
      const yardage = item.yardage == null || item.yardage === "" ? null : Number(item.yardage);
      if (!text(item.name) || !Number.isInteger(quantity) || quantity < 0
        || (yardage !== null && (!Number.isFinite(yardage) || yardage < 0))
        || (item.photoData != null && (typeof item.photoData !== "string"
          || !/^data:image\/[a-z0-9.+-]+;base64,/i.test(item.photoData)))) {
        throw new Error("De back-up bevat garengegevens die niet geldig zijn.");
      }
      return {
        name: text(item.name),
        brand: text(item.brand),
        color: text(item.color),
        weight: text(item.weight),
        fiber: text(item.fiber),
        yardage,
        quantity,
        projects: projectNames(Array.isArray(item.projects) ? item.projects.join(", ") : item.projects),
        photoData: item.photoData || null,
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
