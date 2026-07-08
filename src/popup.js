const state = {
  detected: null,
  activeTab: null,
  collections: [],
  expandedId: null,
  draftCollection: null
};

const els = {
  pageStatus: document.querySelector("#pageStatus"),
  createCollection: document.querySelector("#createCollection"),
  collections: document.querySelector("#collections"),
  message: document.querySelector("#message")
};

async function init() {
  bindEvents();
  await detectCurrentPage();
  await renderCollections();
}

function bindEvents() {
  els.createCollection.innerHTML = iconPlus();
  els.createCollection.addEventListener("click", () => {
    state.draftCollection = {
      title: "",
      fonts: state.detected ? detectedEntries() : []
    };
    state.expandedId = null;
    renderCollections();
  });
}

async function detectCurrentPage() {
  const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
  state.activeTab = tab || null;
  state.detected = tab && tab.url ? FontSources.parseCurrentPage(tab.url) : null;

  if (!state.detected) {
    els.pageStatus.textContent = "Saved collections";
    return;
  }

  const count = state.detected.families.length;
  els.pageStatus.textContent = count === 1
    ? `${state.detected.family} detected`
    : `${count} fonts detected`;
}

async function renderCollections() {
  state.collections = await BookmarkStore.listCollections();
  els.collections.textContent = "";

  if (state.draftCollection) {
    els.collections.append(renderDraftCollection(state.draftCollection));
  }

  if (!state.collections.length && !state.draftCollection) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Use + to create a collection.";
    els.collections.append(empty);
    return;
  }

  state.collections.forEach((collection) => {
    els.collections.append(renderCollection(collection));
  });
}

function renderDraftCollection(draft) {
  const card = document.createElement("article");
  card.className = "collection expanded draft";

  const main = document.createElement("div");
  main.className = "collectionMain";

  const icon = document.createElement("span");
  icon.className = "collectionIcon";
  icon.append(collectionIconImage(defaultCollectionName()));

  const meta = document.createElement("div");
  meta.className = "collectionMeta";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "draftInput";
  input.placeholder = defaultCollectionName();
  input.setAttribute("aria-label", "New collection name");

  const count = document.createElement("span");
  count.className = "fontCount";
  count.textContent = `${draft.fonts.length} ${draft.fonts.length === 1 ? "font" : "fonts"}`;

  meta.append(input, count);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "quickAction";
  close.innerHTML = iconClose();
  close.setAttribute("aria-label", "Cancel collection");
  close.addEventListener("mousedown", (event) => event.preventDefault());
  close.addEventListener("click", () => {
    state.draftCollection = null;
    renderCollections();
  });

  main.append(icon, meta, close);

  const actions = document.createElement("div");
  actions.className = "draftActions";

  const save = document.createElement("button");
  save.type = "button";
  save.textContent = "Create";
  save.addEventListener("mousedown", (event) => event.preventDefault());
  save.addEventListener("click", () => saveDraftCollection(input.value));

  actions.append(save);
  card.append(main, actions);

  requestAnimationFrame(() => input.focus());
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") saveDraftCollection(input.value);
    if (event.key === "Escape") {
      state.draftCollection = null;
      renderCollections();
    }
  });
  input.addEventListener("blur", () => {
    if (state.draftCollection) saveDraftCollection(input.value);
  });

  return card;
}

async function saveDraftCollection(rawTitle) {
  if (!state.draftCollection) return;
  const title = rawTitle.trim() || defaultCollectionName();
  const fonts = state.draftCollection.fonts;
  state.draftCollection = null;
  await BookmarkStore.createCollection(title, fonts);
  showMessage(fonts.length ? "Collection created with this font." : "Collection created.");
  await renderCollections();
}

function renderCollection(collection) {
  const card = document.createElement("article");
  card.className = "collection";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Open ${collection.title}`);
  card.addEventListener("click", () => openCollection(collection));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCollection(collection);
    }
  });

  const main = document.createElement("div");
  main.className = "collectionMain";

  const icon = document.createElement("span");
  icon.className = "collectionIcon";
  icon.append(collectionIconImage(collection.title));

  const meta = document.createElement("div");
  meta.className = "collectionMeta";

  const titleRow = document.createElement("div");
  titleRow.className = "titleRow";

  const title = state.expandedId === collection.id
    ? editableTitle(collection)
    : document.createElement("strong");
  title.className = "collectionTitle";
  if (title.tagName !== "INPUT") title.textContent = collection.title;

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "iconButton";
  editButton.innerHTML = state.expandedId === collection.id
    ? iconClose()
    : iconEdit();
  editButton.setAttribute(
    "aria-label",
    state.expandedId === collection.id ? `Close ${collection.title} options` : `Edit ${collection.title}`
  );
  editButton.addEventListener("click", (event) => {
    event.stopPropagation();
    state.expandedId = state.expandedId === collection.id ? null : collection.id;
    renderCollections();
  });

  titleRow.append(title);

  const count = document.createElement("span");
  count.className = "fontCount";
  count.textContent = `${collection.families.length} ${collection.families.length === 1 ? "font" : "fonts"}`;

  meta.append(titleRow, count);

  main.append(icon, meta, editButton);
  if (state.expandedId !== collection.id) {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "quickAction";
    action.textContent = currentFontsAreSaved(collection) ? "-" : "+";
    action.disabled = !state.detected;
    action.setAttribute("aria-label", actionLabel(collection));
    action.addEventListener("click", async (event) => {
      event.stopPropagation();
      await toggleCurrentFonts(collection);
    });
    main.append(action);
  }
  card.append(main);

  if (state.expandedId === collection.id) {
    card.classList.add("expanded");
    card.append(renderEditor(collection));
  }

  return card;
}

function renderEditor(collection) {
  const editor = document.createElement("div");
  editor.className = "editor";
  editor.addEventListener("click", (event) => event.stopPropagation());

  const label = document.createElement("span");
  label.className = "sectionLabel";
  label.textContent = "Fonts";

  const fontList = document.createElement("div");
  fontList.className = "editorFonts";

  if (collection.families.length) {
    collection.families.forEach((family) => {
      const row = document.createElement("div");
      row.className = "fontRow";

      const name = document.createElement("span");
      name.textContent = family;

      const entry = collection.entries.find((item) => item.family === family);
      const source = document.createElement("span");
      source.className = "sourceBadge";
      source.textContent = entry?.sourceName || "Font";

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "removeIconButton";
      remove.innerHTML = iconClose();
      remove.setAttribute("aria-label", `Remove ${family}`);
      remove.addEventListener("click", async () => {
        await BookmarkStore.removeFont(collection, family);
        showMessage("Font removed.");
        await renderCollections();
      });

      const details = document.createElement("div");
      details.className = "fontDetails";
      details.append(name, source);

      row.append(details, remove);
      fontList.append(row);
    });
  } else {
    const empty = document.createElement("p");
    empty.className = "emptyInline";
    empty.textContent = "No fonts in this collection.";
    fontList.append(empty);
  }

  const footer = document.createElement("div");
  footer.className = "editorFooter";

  const open = document.createElement("button");
  open.type = "button";
  open.className = "secondary";
  open.textContent = "Open collection";
  open.addEventListener("click", () => openCollection(collection));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "danger";
  deleteButton.innerHTML = iconTrash();
  deleteButton.setAttribute("aria-label", "Delete collection");
  deleteButton.addEventListener("click", async () => {
    await BookmarkStore.deleteCollection(collection);
    state.expandedId = null;
    showMessage("Collection deleted.");
    await renderCollections();
  });

  footer.append(open, deleteButton);
  editor.append(label, fontList, footer);
  return editor;
}

function editableTitle(collection) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = collection.title;
  input.setAttribute("aria-label", "Collection title");
  input.addEventListener("click", (event) => event.stopPropagation());
  input.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      state.expandedId = null;
      await renderCollections();
    }
  });
  input.addEventListener("blur", () => rename(collection, input.value));
  return input;
}

async function rename(collection, title) {
  const nextTitle = title.trim();
  if (!nextTitle) return showMessage("Name the collection first.");
  await BookmarkStore.renameCollection(collection, nextTitle);
  showMessage("Collection renamed.");
  await renderCollections();
}

async function toggleCurrentFonts(collection) {
  if (!state.detected) return;

  if (currentFontsAreSaved(collection)) {
    const removeSet = new Set(state.detected.families);
    await BookmarkStore.setFonts(
      collection,
      collection.entries.filter((entry) => !removeSet.has(entry.family))
    );
    showMessage("Font removed.");
  } else {
    if (shouldCapturePreview()) {
      await startPreviewSelection(collection);
      return;
    }
    await BookmarkStore.setFonts(collection, [...collection.entries, ...detectedEntries()]);
    showMessage("Font added.");
  }

  await renderCollections();
}

async function startPreviewSelection(collection) {
  await ext.runtime.sendMessage({
    type: "fontfox:start-preview-capture",
    collectionId: collection.id,
    entries: detectedEntries()
  });
  await PreviewCapture.openSelector(state.activeTab.id);
  showMessage("Select preview area on the page.");
  window.close();
}

function shouldCapturePreview() {
  return Boolean(state.detected)
    && state.detected.source !== "google-fonts"
    && state.activeTab?.id;
}

async function openCollection(collection) {
  await ext.tabs.create({
    url: ext.runtime.getURL(`collection.html?id=${encodeURIComponent(collection.id)}`)
  });
}

function currentFontsAreSaved(collection) {
  return Boolean(state.detected)
    && state.detected.families.every((family) => collection.families.includes(family));
}

function detectedEntries() {
  const entries = state.detected?.entries || state.detected?.families.map((family) => ({
    family,
    source: state.detected.source,
    sourceName: state.detected.source === "google-fonts" ? "Google Fonts" : state.detected.source,
    sourceUrl: state.detected.sourceUrl
  })) || [];

  return entries.map((entry) => ({
    ...entry
  }));
}

function actionLabel(collection) {
  if (!state.detected) return `Open ${collection.title}`;
  return currentFontsAreSaved(collection)
    ? `Remove ${state.detected.family} from ${collection.title}`
    : `Add ${state.detected.family} to ${collection.title}`;
}

function defaultCollectionName() {
  return `Collection ${state.collections.length + 1}`;
}

function collectionIconImage(seed) {
  const img = document.createElement("img");
  img.alt = "";
  img.src = collectionIconPath(seed);
  return img;
}

function collectionIconPath(seed) {
  const icons = ["assets/noto-palette.svg", "assets/noto-bookmark.svg"];
  let hash = 0;
  for (const char of seed) hash = (hash + char.charCodeAt(0)) % icons.length;
  return icons[hash];
}

function showMessage(text) {
  els.message.textContent = text;
  setTimeout(() => {
    if (els.message.textContent === text) els.message.textContent = "";
  }, 2500);
}

function iconEdit() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  `;
}

function iconClose() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  `;
}

function iconPlus() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  `;
}

function iconTrash() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  `;
}

init().catch((error) => {
  console.error(error);
  showMessage(error.message || "Something went wrong.");
});
