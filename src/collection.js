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
  loadGoogleFontCss(collection.entries);
  renderFontCards();
  renderOtherCollections();
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
  const card = document.createElement("article");
  card.className = "fontRow";

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
  if (entry.source === "google-fonts") return "";
  if (entry.designer) return entry.designer;
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
