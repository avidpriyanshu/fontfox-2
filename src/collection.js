const collectionState = {
  collection: null
};

const collectionEls = {
  topActions: document.querySelector("#topActions"),
  collectionTitle: document.querySelector("#collectionTitle"),
  collectionMeta: document.querySelector("#collectionMeta"),
  previewText: document.querySelector("#previewText"),
  previewSize: document.querySelector("#previewSize"),
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
  collectionEls.previewSize.addEventListener("change", syncPreviewSizeFromSelect);
  collectionEls.previewSizeRange.addEventListener("input", syncPreviewSizeFromRange);
  collectionEls.clearPreview.addEventListener("click", clearPreview);
}

function renderCollectionPage() {
  const collection = collectionState.collection;
  collectionEls.collectionTitle.textContent = collection.title;
  collectionEls.collectionMeta.textContent =
    `${collection.entries.length} ${collection.entries.length === 1 ? "font family" : "font families"}`;

  collectionEls.topActions.textContent = "";
  const googleFamilies = collection.entries
    .filter((entry) => entry.source === "google-fonts")
    .map((entry) => entry.family);

  if (googleFamilies.length) {
    const openGoogle = document.createElement("button");
    openGoogle.type = "button";
    openGoogle.className = "button";
    openGoogle.textContent = "Open Google fonts";
    openGoogle.addEventListener("click", () => {
      location.href = FontSources.buildGooglePreviewUrl(googleFamilies);
    });
    collectionEls.topActions.append(openGoogle);
  }

  renderFontCards();
  renderOtherCollections();
}

function renderFontCards() {
  const collection = collectionState.collection;
  const sample = collectionEls.previewText.value.trim() || "Whereas recognition of the inherent dignity";
  collectionEls.fontGrid.textContent = "";
  document.documentElement.style.setProperty("--preview-size", `${collectionEls.previewSizeRange.value}px`);

  collection.entries.forEach((entry, index) => {
    collectionEls.fontGrid.append(renderFontCard(entry, sample, index));
  });
}

function renderFontCard(entry, sample, index) {
  const card = document.createElement("article");
  card.className = "fontRow";
  if (index === 0) card.classList.add("highlight");

  const head = document.createElement("header");
  head.className = "cardHead";

  const titleWrap = document.createElement("div");
  const name = document.createElement("h2");
  name.className = "fontName";
  name.textContent = entry.family;

  const meta = document.createElement("p");
  meta.className = "fontMeta";
  meta.textContent = fontMeta(entry);

  titleWrap.append(name);
  if (meta.textContent) titleWrap.append(meta);

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = sourceDetail(entry);
  head.append(titleWrap, badge);

  const preview = document.createElement("p");
  if (canRenderPreview(entry)) {
    preview.className = "sample";
    preview.style.fontFamily = fontCssStack(entry);
    preview.textContent = sample;
  } else {
    preview.className = "unavailablePreview";
    preview.textContent = "Preview unavailable because FontFox does not have this font file. Open the source to view or license the font.";
  }

  const foot = document.createElement("footer");
  foot.className = "cardFoot";

  const css = document.createElement("span");
  css.className = "cssStack";
  css.textContent = fontCssStack(entry);

  const actions = document.createElement("div");
  actions.className = "cardActions";

  if (entry.sourceUrl) {
    const open = iconButton("Open source", iconExternal());
    open.addEventListener("click", () => {
      location.href = entry.sourceUrl;
    });
    actions.append(open);
  }

  const copy = iconButton("Copy CSS", iconCopy());
  copy.addEventListener("click", async () => {
    await navigator.clipboard.writeText(`font-family: ${fontCssStack(entry)};`);
    showCollectionMessage("CSS copied.");
  });
  actions.append(copy);

  foot.append(css, actions);
  card.append(head, preview, foot);
  return card;
}

function fontMeta(entry) {
  if (entry.source === "google-fonts") return "";
  if (entry.designer && entry.foundry) return `${entry.designer} · ${entry.foundry}`;
  if (entry.designer) return entry.designer;
  if (entry.foundry) return entry.foundry;
  return entry.sourceName || "";
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

function syncPreviewSizeFromSelect() {
  collectionEls.previewSizeRange.value = collectionEls.previewSize.value;
  renderFontCards();
}

function syncPreviewSizeFromRange() {
  collectionEls.previewSize.value = nearestSizeOption(collectionEls.previewSizeRange.value);
  renderFontCards();
}

function nearestSizeOption(value) {
  const sizes = [...collectionEls.previewSize.options].map((option) => Number(option.value));
  return String(sizes.reduce((closest, size) => (
    Math.abs(size - value) < Math.abs(closest - value) ? size : closest
  ), sizes[0]));
}

function clearPreview() {
  collectionEls.previewText.value = "";
  renderFontCards();
}

async function renderOtherCollections() {
  const collections = await BookmarkStore.listCollections();
  const others = collections.filter((collection) => collection.id !== collectionState.collection.id);
  collectionEls.otherCollections.textContent = "";

  if (!others.length) {
    const empty = document.createElement("p");
    empty.className = "message";
    empty.textContent = "No other collections yet.";
    collectionEls.otherCollections.append(empty);
    return;
  }

  others.forEach((collection) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "collectionLink";
    button.addEventListener("click", () => {
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

function iconButton(label, icon) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "iconButton";
  button.setAttribute("aria-label", label);
  button.innerHTML = icon;
  return button;
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
