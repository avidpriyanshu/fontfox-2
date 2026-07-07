const collectionState = {
  collection: null,
  editMode: false,
  selectedFontKeys: new Set()
};

const collectionEls = {
  topActions: document.querySelector("#topActions"),
  collectionTitle: document.querySelector("#collectionTitle"),
  collectionActions: document.querySelector("#collectionActions"),
  collectionMeta: document.querySelector("#collectionMeta"),
  previewText: document.querySelector("#previewText"),
  previewSizeLabel: document.querySelector("#previewSizeLabel"),
  previewSizeRange: document.querySelector("#previewSizeRange"),
  clearPreview: document.querySelector("#clearPreview"),
  fontGrid: document.querySelector("#fontGrid"),
  otherCollections: document.querySelector("#otherCollections"),
  message: document.querySelector("#message")
};

async function initCollectionPage() {
  const id = new URL(location.href).searchParams.get("id");
  if (!id) return showCollectionMessage("Missing collection id.");

  collectionState.collection = await BookmarkStore.getCollection(id);
  if (!collectionState.collection) return showCollectionMessage("Collection not found.");

  renderCollectionPage();
  collectionEls.previewText.addEventListener("input", renderFontCards);
  collectionEls.previewSizeRange.addEventListener("input", syncPreviewSizeFromRange);
  collectionEls.clearPreview.addEventListener("click", clearPreview);
}

function renderCollectionPage() {
  const collection = collectionState.collection;
  collectionEls.collectionMeta.textContent =
    `${collection.entries.length} ${collection.entries.length === 1 ? "font family" : "font families"}`;

  collectionEls.topActions.textContent = "";
  renderCollectionHeader();
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

  const edit = iconButton(collectionState.editMode ? "Close editor" : "Edit collection", collectionState.editMode ? iconClose() : iconPencil());
  edit.addEventListener("click", () => {
    collectionState.editMode = !collectionState.editMode;
    collectionState.selectedFontKeys.clear();
    renderCollectionPage();
  });
  collectionEls.collectionActions.append(edit);

  const exportButton = iconButton("Export collection", iconExport());
  exportButton.addEventListener("click", exportCollectionText);
  collectionEls.collectionActions.append(exportButton);

  if (collectionState.editMode) {
    const deleteSelected = document.createElement("button");
    deleteSelected.type = "button";
    deleteSelected.className = "button dangerText";
    deleteSelected.textContent = "Delete selected";
    deleteSelected.disabled = collectionState.selectedFontKeys.size === 0;
    deleteSelected.addEventListener("click", deleteSelectedFonts);
    collectionEls.collectionActions.append(deleteSelected);
  }
}

function renderFontCards() {
  const collection = collectionState.collection;
  const sample = collectionEls.previewText.value.trim() || "Whereas recognition of the inherent dignity";
  collectionEls.fontGrid.textContent = "";
  document.documentElement.style.setProperty("--preview-size", `${collectionEls.previewSizeRange.value}px`);

  collection.entries.forEach((entry) => {
    collectionEls.fontGrid.append(renderFontCard(entry, sample));
  });
}

function renderFontCard(entry, sample) {
  const fontKey = entryKey(entry);
  const card = document.createElement("article");
  card.className = "fontRow";
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
  head.append(titleWrap, badges);

  const preview = document.createElement("p");
  if (canRenderPreview(entry)) {
    preview.className = "sample";
    preview.style.fontFamily = fontCssStack(entry);
    preview.textContent = sample;
  } else {
    preview.className = "unavailablePreview";
    preview.textContent = "No preview available";
  }

  const foot = document.createElement("footer");
  foot.className = "cardFoot";

  const actions = document.createElement("div");
  actions.className = "cardActions";

  if (entry.sourceUrl) {
    const open = iconButton("Open source", iconExternal());
    open.addEventListener("click", () => {
      location.href = entry.sourceUrl;
    });
    actions.append(open);
  }

  if (canRenderPreview(entry)) {
    const css = document.createElement("span");
    css.className = "cssStack";
    css.textContent = fontCssStack(entry);
    foot.append(css);

    const copy = iconButton("Copy CSS", iconCopy());
    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(`font-family: ${fontCssStack(entry)};`);
      showCollectionMessage("CSS copied.");
    });
    actions.append(copy);
  }

  if (actions.children.length) foot.append(actions);
  if (foot.children.length === 1 && foot.firstElementChild === actions) {
    foot.classList.add("actionsOnly");
  }
  card.append(head, preview, foot);
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

async function exportCollectionText() {
  const lines = [
    collectionState.collection.title,
    `${collectionState.collection.entries.length} ${collectionState.collection.entries.length === 1 ? "font" : "fonts"}`,
    "",
    ...collectionState.collection.entries.map((entry) => {
      const parts = [entry.family, sourceDetail(entry)];
      if (entry.sourceUrl) parts.push(entry.sourceUrl);
      return parts.join(" - ");
    })
  ];
  await navigator.clipboard.writeText(lines.join("\n"));
  showCollectionMessage("Collection copied.");
}

async function renderOtherCollections() {
  const collections = await BookmarkStore.listCollections();
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

    const name = document.createElement("span");
    name.textContent = collection.title;

    const count = document.createElement("span");
    count.textContent = `${collection.entries.length} ${collection.entries.length === 1 ? "font" : "fonts"}`;

    button.append(name, count);
    collectionEls.otherCollections.append(button);
  });
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

function iconExport() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5"></path><path d="M12 15V3"></path></svg>`;
}

function iconExternal() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7"></path><path d="M10 14 21 3"></path><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"></path></svg>`;
}

function iconCopy() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
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
