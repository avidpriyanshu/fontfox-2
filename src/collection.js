const collectionState = {
  collection: null
};

const collectionEls = {
  topActions: document.querySelector("#topActions"),
  collectionMeta: document.querySelector("#collectionMeta"),
  previewText: document.querySelector("#previewText"),
  fontGrid: document.querySelector("#fontGrid"),
  message: document.querySelector("#message")
};

async function initCollectionPage() {
  const id = new URL(location.href).searchParams.get("id");
  if (!id) return showCollectionMessage("Missing collection id.");

  collectionState.collection = await BookmarkStore.getCollection(id);
  if (!collectionState.collection) return showCollectionMessage("Collection not found.");

  renderCollectionPage();
  collectionEls.previewText.addEventListener("input", renderFontCards);
}

function renderCollectionPage() {
  const collection = collectionState.collection;
  collectionEls.collectionMeta.textContent =
    `${collection.title} · ${collection.entries.length} ${collection.entries.length === 1 ? "font family" : "font families"}`;

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
}

function renderFontCards() {
  const collection = collectionState.collection;
  const sample = collectionEls.previewText.value.trim() || "Whereas recognition of the inherent dignity";
  collectionEls.fontGrid.textContent = "";

  collection.entries.forEach((entry) => {
    collectionEls.fontGrid.append(renderFontCard(entry, sample));
  });
}

function renderFontCard(entry, sample) {
  const card = document.createElement("article");
  card.className = "fontCard";

  const head = document.createElement("header");
  head.className = "cardHead";

  const titleWrap = document.createElement("div");
  const name = document.createElement("h2");
  name.className = "fontName";
  name.textContent = entry.family;

  const meta = document.createElement("p");
  meta.className = "fontMeta";
  meta.textContent = fontMeta(entry);

  titleWrap.append(name, meta);

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = entry.sourceName || entry.source || "Font";
  head.append(titleWrap, badge);

  const preview = document.createElement("p");
  preview.className = entry.source === "google-fonts" ? "sample" : "sample unavailable";
  preview.textContent = entry.source === "google-fonts" ? sample : (entry.summary || "Preview unavailable. FontFox saved the source and CSS metadata for this font.");

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
  if (entry.designer && entry.foundry) return `${entry.designer} · ${entry.foundry}`;
  if (entry.designer) return entry.designer;
  if (entry.summary) return entry.summary;
  return entry.sourceName || "";
}

function fontCssStack(entry) {
  if (entry.source === "google-fonts") return `"${entry.family}", sans-serif`;
  if (entry.category && entry.category.toLowerCase().includes("serif")) return `"${entry.family}", serif`;
  return `"${entry.family}", sans-serif`;
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
