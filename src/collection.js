const collectionState = {
  collection: null,
  shared: false,
  editMode: false,
  collections: [],
  contextCollection: null,
  selectedFontKeys: new Set(),
  viewMode: localStorage.getItem("fontfox.collectionViewMode") || "list"
};

const WEB_SHARE_URL = "https://avidpriyanshu.github.io/fontfox-2/collection.html";

const collectionEls = {
  topActions: document.querySelector("#topActions"),
  collectionTitle: document.querySelector("#collectionTitle"),
  collectionActions: document.querySelector("#collectionActions"),
  collectionMeta: document.querySelector("#collectionMeta"),
  viewToggle: document.querySelector("#viewToggle"),
  previewText: document.querySelector("#previewText"),
  previewSizeLabel: document.querySelector("#previewSizeLabel"),
  previewSizeRange: document.querySelector("#previewSizeRange"),
  clearPreview: document.querySelector("#clearPreview"),
  fontGrid: document.querySelector("#fontGrid"),
  otherCollections: document.querySelector("#otherCollections"),
  message: document.querySelector("#message")
};

const collectionMenu = createCollectionContextMenu();
const exportMenu = createExportMenu();

async function initCollectionPage() {
  const params = new URL(location.href).searchParams;
  const share = params.get("share") || parseShareHash(location.hash);
  if (share) {
    collectionState.collection = parseSharedCollection(share);
    collectionState.shared = true;
    renderCollectionPage();
    collectionEls.previewText.addEventListener("input", renderFontCards);
    collectionEls.previewSizeRange.addEventListener("input", syncPreviewSizeFromRange);
    collectionEls.clearPreview.addEventListener("click", clearPreview);
    document.addEventListener("click", closeMenus);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenus();
    });
    return;
  }

  const id = params.get("id");
  if (!globalThis.browser && !globalThis.chrome) {
    return showCollectionMessage("Open a shared collection URL or install FontFox to view saved local collections.");
  }
  if (!id) return showCollectionMessage("Missing collection id.");

  collectionState.collection = await BookmarkStore.getCollection(id);
  if (!collectionState.collection) return showCollectionMessage("Collection not found.");

  renderCollectionPage();
  collectionEls.previewText.addEventListener("input", renderFontCards);
  collectionEls.previewSizeRange.addEventListener("input", syncPreviewSizeFromRange);
  collectionEls.clearPreview.addEventListener("click", clearPreview);
  document.addEventListener("click", closeMenus);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenus();
  });
}

function renderCollectionPage() {
  const collection = collectionState.collection;
  collectionEls.collectionMeta.textContent =
    `${collection.entries.length} ${collection.entries.length === 1 ? "font family" : "font families"}`;

  collectionEls.topActions.textContent = "";
  renderCollectionHeader();
  renderViewToggle();
  loadGoogleFontCss(collection.entries);
  renderFontCards();
  renderOtherCollections();
}

function renderCollectionHeader() {
  collectionEls.collectionTitle.textContent = "";
  collectionEls.collectionActions.textContent = "";

  if (collectionState.editMode) {
    const titleInput = document.createElement("input");
    titleInput.className = "titleInput";
    titleInput.value = collectionState.collection.title;
    titleInput.setAttribute("aria-label", "Collection name");
    titleInput.addEventListener("blur", () => saveCollectionTitle(titleInput.value));
    titleInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") titleInput.blur();
      if (event.key === "Escape") {
        titleInput.value = collectionState.collection.title;
        titleInput.blur();
      }
    });
    collectionEls.collectionTitle.append(titleInput);
  } else {
    collectionEls.collectionTitle.textContent = collectionState.collection.title;
  }

  if (!collectionState.shared) {
    const edit = iconButton(collectionState.editMode ? "Close editor" : "Edit collection", collectionState.editMode ? iconClose() : iconPencil());
    edit.addEventListener("click", () => {
      collectionState.editMode = !collectionState.editMode;
      collectionState.selectedFontKeys.clear();
      renderCollectionPage();
    });
    collectionEls.collectionActions.append(edit);
  }

  const exportButton = iconButton("Share collection", iconShare());
  exportButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openExportMenu(exportButton);
  });
  collectionEls.collectionActions.append(exportButton);

  if (collectionState.editMode && !collectionState.shared) {
    const deleteSelected = document.createElement("button");
    deleteSelected.type = "button";
    deleteSelected.className = "button dangerText";
    deleteSelected.textContent = "Delete selected";
    deleteSelected.disabled = collectionState.selectedFontKeys.size === 0;
    deleteSelected.addEventListener("click", deleteSelectedFonts);
    collectionEls.collectionActions.append(deleteSelected);
  }
}

function renderViewToggle() {
  collectionEls.viewToggle.textContent = "";
  [
    { id: "list", label: "Row", icon: iconRows() },
    { id: "grid", label: "Grid", icon: iconGrid() }
  ].forEach((view) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "viewButton";
    if (collectionState.viewMode === view.id) {
      button.classList.add("isActive");
      button.setAttribute("aria-pressed", "true");
    } else {
      button.setAttribute("aria-pressed", "false");
    }
    button.innerHTML = `${view.icon}<span>${view.label}</span>`;
    button.addEventListener("click", () => {
      collectionState.viewMode = view.id;
      localStorage.setItem("fontfox.collectionViewMode", view.id);
      renderViewToggle();
      renderFontCards();
    });
    collectionEls.viewToggle.append(button);
  });
}

function renderFontCards() {
  const collection = collectionState.collection;
  const sample = collectionEls.previewText.value.trim() || "Whereas recognition of the inherent dignity";
  collectionEls.fontGrid.textContent = "";
  collectionEls.fontGrid.className = collectionState.viewMode === "grid" ? "grid gridView" : "grid";
  document.documentElement.style.setProperty("--preview-size", `${collectionEls.previewSizeRange.value}px`);

  collection.entries.forEach((entry) => {
    collectionEls.fontGrid.append(renderFontCard(entry, sample));
  });
}

function renderFontCard(entry, sample) {
  const fontKey = entryKey(entry);
  const card = document.createElement("article");
  card.className = collectionState.viewMode === "grid" ? "fontRow fontCard" : "fontRow";
  if (collectionState.editMode) card.classList.add("isEditing");

  const head = document.createElement("header");
  head.className = "cardHead";

  const titleWrap = document.createElement("div");
  titleWrap.className = "fontTitleWrap";

  if (collectionState.editMode) {
    const select = document.createElement("input");
    select.type = "checkbox";
    select.className = "fontSelect";
    select.checked = collectionState.selectedFontKeys.has(fontKey);
    select.setAttribute("aria-label", `Select ${entry.family}`);
    select.addEventListener("change", () => {
      if (select.checked) collectionState.selectedFontKeys.add(fontKey);
      else collectionState.selectedFontKeys.delete(fontKey);
      renderCollectionHeader();
    });
    titleWrap.append(select);
  }

  const titleText = document.createElement("div");
  const name = document.createElement("h2");
  name.className = "fontName";
  name.textContent = entry.family;

  const meta = document.createElement("p");
  meta.className = "fontMeta";
  meta.textContent = fontMeta(entry);

  titleText.append(name);
  if (meta.textContent) titleText.append(meta);
  titleWrap.append(titleText);

  const badges = document.createElement("div");
  badges.className = "badges";
  if (entry.type) {
    const typeBadge = document.createElement("span");
    typeBadge.className = "badge typeBadge";
    typeBadge.textContent = entry.type;
    badges.append(typeBadge);
  }

  const sourceBadge = document.createElement("span");
  sourceBadge.className = "badge";
  sourceBadge.textContent = sourceDetail(entry);
  badges.append(sourceBadge);
  if (entry.sourceUrl) {
    const open = iconButton("Open source", iconExternal());
    open.classList.add("inlineIconButton");
    open.addEventListener("click", () => {
      location.href = entry.sourceUrl;
    });
    badges.append(open);
  }
  head.append(titleWrap, badges);

  let preview;
  if (canRenderPreview(entry)) {
    preview = document.createElement("p");
    preview.className = "sample";
    preview.style.fontFamily = fontCssStack(entry);
    preview.textContent = sample;
  } else if (entry.previewImage) {
    preview = document.createElement("img");
    preview.className = "capturedFontPreview";
    preview.src = entry.previewImage;
    preview.alt = `${entry.family} captured preview`;
  } else {
    preview = document.createElement("p");
    preview.className = "unavailablePreview";
    preview.textContent = "No preview available";
  }

  card.append(head, preview);
  return card;
}

function fontMeta(entry) {
  return "";
}

function sourceDetail(entry) {
  if (entry.source === "google-fonts") return "Google Fonts";
  return entry.sourceName || entry.source || "Font";
}

function canRenderPreview(entry) {
  if (entry.fontFaceUrl) return true;
  return entry.source === "google-fonts";
}

function fontCssStack(entry) {
  if (entry.source === "google-fonts") return `"${entry.family}", sans-serif`;
  return `"${entry.family}", sans-serif`;
}

function loadGoogleFontCss(entries) {
  document.querySelectorAll("link[data-fontfox-google-fonts]").forEach((node) => node.remove());
  const families = [...new Set(entries
    .filter((entry) => entry.source === "google-fonts")
    .map((entry) => entry.family))];

  if (!families.length) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.dataset.fontfoxGoogleFonts = "true";
  const params = new URLSearchParams();
  families.forEach((family) => params.append("family", family.replace(/\s+/g, "+")));
  link.href = `https://fonts.googleapis.com/css2?${params.toString()}&display=swap`;
  document.head.append(link);
}

function syncPreviewSizeFromRange() {
  collectionEls.previewSizeLabel.textContent = `${collectionEls.previewSizeRange.value}px`;
  renderFontCards();
}

function clearPreview() {
  collectionEls.previewText.value = "";
  renderFontCards();
}

async function saveCollectionTitle(title) {
  const nextTitle = title.trim() || "Untitled collection";
  if (nextTitle === collectionState.collection.title) return;
  await BookmarkStore.renameCollection(collectionState.collection, nextTitle);
  collectionState.collection = await BookmarkStore.getCollection(collectionState.collection.id);
  renderCollectionPage();
  showCollectionMessage("Collection renamed.");
}

async function deleteSelectedFonts() {
  if (!collectionState.selectedFontKeys.size) return;
  const entries = collectionState.collection.entries.filter((entry) => !collectionState.selectedFontKeys.has(entryKey(entry)));
  await BookmarkStore.setFonts(collectionState.collection, entries);
  collectionState.collection = await BookmarkStore.getCollection(collectionState.collection.id);
  collectionState.selectedFontKeys.clear();
  renderCollectionPage();
  showCollectionMessage("Selected fonts deleted.");
}

function createExportMenu() {
  const menu = document.createElement("div");
  menu.className = "contextMenu exportMenu";
  menu.hidden = true;

  [
    ["Download Markdown", downloadMarkdown],
    ["Download JSON", downloadJson],
    ["Copy Markdown", copyMarkdown],
    ["Copy Web Share URL", copyShareUrl]
  ].forEach(([label, action]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      closeExportMenu();
      await action();
    });
    menu.append(button);
  });

  document.body.append(menu);
  return menu;
}

function openExportMenu(anchor) {
  closeCollectionContextMenu();
  exportMenu.hidden = false;
  const anchorRect = anchor.getBoundingClientRect();
  const menuRect = exportMenu.getBoundingClientRect();
  exportMenu.style.left = `${Math.max(8, anchorRect.right - menuRect.width)}px`;
  exportMenu.style.top = `${anchorRect.bottom + 8}px`;
}

function closeExportMenu() {
  exportMenu.hidden = true;
}

async function downloadMarkdown() {
  downloadFile(`${safeFileName(collectionState.collection.title)}.md`, collectionMarkdown(), "text/markdown");
  showCollectionMessage("Markdown downloaded.");
}

async function downloadJson() {
  const data = {
    title: collectionState.collection.title,
    exportedAt: new Date().toISOString(),
    entries: collectionState.collection.entries
  };
  downloadFile(`${safeFileName(collectionState.collection.title)}.json`, JSON.stringify(data, null, 2), "application/json");
  showCollectionMessage("JSON downloaded.");
}

async function copyMarkdown() {
  await copyText(collectionMarkdown());
  showCollectionMessage("Markdown copied.");
}

async function copyShareUrl() {
  await copyText(collectionShareUrl());
  showCollectionMessage("Share URL copied.");
}

function collectionMarkdown() {
  const collection = collectionState.collection;
  const lines = [
    `# ${collection.title}`,
    "",
    `${collection.entries.length} ${collection.entries.length === 1 ? "font" : "fonts"}`,
    "",
    ...collection.entries.flatMap((entry) => {
      const line = entry.sourceUrl
        ? `- [${entry.family}](${entry.sourceUrl}) - ${sourceDetail(entry)}`
        : `- ${entry.family} - ${sourceDetail(entry)}`;
      return entry.previewImage ? [line, "  - Captured preview stored in FontFox JSON export."] : [line];
    })
  ];
  return `${lines.join("\n")}\n`;
}

function collectionShareUrl() {
  const payload = {
    title: collectionState.collection.title,
    entries: collectionState.collection.entries.map(({ previewImage, ...entry }) => entry)
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  return `${WEB_SHARE_URL}#share=${encodeURIComponent(encoded)}`;
}

function parseShareHash(hash) {
  if (!hash) return "";
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!value.startsWith("share=")) return "";
  return value.slice("share=".length);
}

function parseSharedCollection(share) {
  try {
    const encoded = decodeURIComponent(share);
    const payload = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    const entries = Array.isArray(payload.entries) ? payload.entries.filter((entry) => entry?.family) : [];
    return {
      id: null,
      title: payload.title || "Shared collection",
      url: location.href,
      families: entries.map((entry) => entry.family),
      entries
    };
  } catch {
    showCollectionMessage("Could not open shared collection.");
    return {
      id: null,
      title: "Shared collection",
      url: location.href,
      families: [],
      entries: []
    };
  }
}

function downloadFile(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

function safeFileName(name) {
  return (name || "fontfox-collection")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "fontfox-collection";
}

async function renderOtherCollections() {
  if (collectionState.shared || !globalThis.browser && !globalThis.chrome) {
    collectionState.collections = [];
    collectionEls.otherCollections.textContent = "";
    const empty = document.createElement("p");
    empty.className = "message";
    empty.textContent = "Shared collection";
    collectionEls.otherCollections.append(empty);
    return;
  }

  const collections = await BookmarkStore.listCollections();
  collectionState.collections = collections;
  collectionEls.otherCollections.textContent = "";

  if (!collections.length) {
    const empty = document.createElement("p");
    empty.className = "message";
    empty.textContent = "No collections yet.";
    collectionEls.otherCollections.append(empty);
    return;
  }

  collections.forEach((collection) => {
    const isCurrent = collection.id === collectionState.collection.id;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "collectionLink";
    if (isCurrent) {
      button.classList.add("isActive");
      button.setAttribute("aria-current", "page");
    }
    button.addEventListener("click", () => {
      if (isCurrent) return;
      location.href = ext.runtime.getURL(`collection.html?id=${encodeURIComponent(collection.id)}`);
    });
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openCollectionContextMenu(collection, event.clientX, event.clientY);
    });

    const name = document.createElement("span");
    name.textContent = collection.title;

    const count = document.createElement("span");
    count.textContent = `${collection.entries.length} ${collection.entries.length === 1 ? "font" : "fonts"}`;

    button.append(name, count);
    collectionEls.otherCollections.append(button);
  });
}

function createCollectionContextMenu() {
  const menu = document.createElement("div");
  menu.className = "contextMenu";
  menu.hidden = true;

  const rename = document.createElement("button");
  rename.type = "button";
  rename.textContent = "Rename";
  rename.addEventListener("click", renameContextCollection);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "dangerMenuItem";
  remove.textContent = "Delete";
  remove.addEventListener("click", deleteContextCollection);

  menu.append(rename, remove);
  document.body.append(menu);
  return menu;
}

function openCollectionContextMenu(collection, x, y) {
  collectionState.contextCollection = collection;
  collectionMenu.hidden = false;
  const menuRect = collectionMenu.getBoundingClientRect();
  const left = Math.min(x, window.innerWidth - menuRect.width - 8);
  const top = Math.min(y, window.innerHeight - menuRect.height - 8);
  collectionMenu.style.left = `${Math.max(8, left)}px`;
  collectionMenu.style.top = `${Math.max(8, top)}px`;
}

function closeCollectionContextMenu() {
  collectionMenu.hidden = true;
  collectionState.contextCollection = null;
}

function closeMenus() {
  closeCollectionContextMenu();
  closeExportMenu();
}

async function renameContextCollection() {
  const collection = collectionState.contextCollection;
  closeCollectionContextMenu();
  if (!collection) return;

  const nextTitle = prompt("Rename collection", collection.title);
  if (nextTitle === null) return;
  const title = nextTitle.trim();
  if (!title || title === collection.title) return;

  await BookmarkStore.renameCollection(collection, title);
  if (collection.id === collectionState.collection.id) {
    collectionState.collection = await BookmarkStore.getCollection(collection.id);
    renderCollectionPage();
  } else {
    renderOtherCollections();
  }
  showCollectionMessage("Collection renamed.");
}

async function deleteContextCollection() {
  const collection = collectionState.contextCollection;
  closeCollectionContextMenu();
  if (!collection) return;
  if (!confirm(`Delete "${collection.title}"?`)) return;

  await BookmarkStore.deleteCollection(collection);
  if (collection.id !== collectionState.collection.id) {
    renderOtherCollections();
    showCollectionMessage("Collection deleted.");
    return;
  }

  const remaining = (await BookmarkStore.listCollections()).filter((item) => item.id !== collection.id);
  if (remaining.length) {
    location.href = ext.runtime.getURL(`collection.html?id=${encodeURIComponent(remaining[0].id)}`);
  } else {
    collectionEls.fontGrid.textContent = "";
    collectionEls.collectionTitle.textContent = "No collections";
    collectionEls.collectionMeta.textContent = "";
    collectionEls.viewToggle.textContent = "";
    collectionEls.collectionActions.textContent = "";
    renderOtherCollections();
    showCollectionMessage("Collection deleted.");
  }
}

function entryKey(entry) {
  return `${entry.source || "font"}:${entry.family}`;
}

function iconButton(label, icon) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "iconButton";
  button.setAttribute("aria-label", label);
  button.innerHTML = icon;
  return button;
}

function iconPencil() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="m16.5 3.5 4 4L7 21H3v-4L16.5 3.5z"></path></svg>`;
}

function iconClose() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;
}

function iconShare() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="m8.6 13.5 6.8 4"></path><path d="m15.4 6.5-6.8 4"></path></svg>`;
}

function iconRows() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16"></path><path d="M4 12h16"></path><path d="M4 18h16"></path></svg>`;
}

function iconGrid() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect></svg>`;
}

function iconExternal() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7"></path><path d="M10 14 21 3"></path><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"></path></svg>`;
}

function showCollectionMessage(text) {
  collectionEls.message.textContent = text;
  setTimeout(() => {
    if (collectionEls.message.textContent === text) collectionEls.message.textContent = "";
  }, 2500);
}

initCollectionPage().catch((error) => {
  console.error(error);
  showCollectionMessage(error.message || "Something went wrong.");
});
