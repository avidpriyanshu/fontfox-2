const api = globalThis.browser || globalThis.chrome;
const METADATA_KEY = "fontfox.collectionMetadata";

let pendingCapture = null;

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "fontfox:start-preview-capture") {
    pendingCapture = {
      collectionId: message.collectionId,
      entries: message.entries || []
    };
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === "fontfox:save-preview-capture") {
    savePreviewCapture(message.rect, sender.tab)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        console.error(error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  return false;
});

async function savePreviewCapture(rect, tab) {
  if (!pendingCapture?.collectionId || !pendingCapture.entries.length) {
    throw new Error("No pending FontFox capture.");
  }

  const image = await captureTabPreview(tab, rect);
  const entries = pendingCapture.entries.map((entry) => ({
    ...entry,
    previewImage: image
  }));
  const collection = await getCollection(pendingCapture.collectionId);
  await setFonts(collection, [...collection.entries, ...entries]);
  pendingCapture = null;
}

async function captureTabPreview(tab, rect) {
  const dataUrl = await callApi(api.tabs, "captureVisibleTab", tab.windowId, { format: "jpeg", quality: 82 });
  return cropDataUrl(dataUrl, rect);
}

async function cropDataUrl(dataUrl, rect) {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const ratio = bitmap.width / Math.max(1, rect.viewportWidth);
    const source = normalizeRect(rect, bitmap, ratio);
    const canvas = new OffscreenCanvas(
      Math.round(source.width),
      Math.round(source.height)
    );
    const context = canvas.getContext("2d");
    context.drawImage(
      bitmap,
      source.x,
      source.y,
      source.width,
      source.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
    const cropped = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.72 });
    return blobToDataUrl(cropped);
  } catch (error) {
    console.warn("Falling back to full screenshot preview.", error);
    return dataUrl;
  }
}

function normalizeRect(rect, bitmap, ratio) {
  const x = Math.max(0, rect.x * ratio);
  const y = Math.max(0, rect.y * ratio);
  const width = Math.min(bitmap.width - x, rect.width * ratio);
  const height = Math.min(bitmap.height - y, rect.height * ratio);

  if (width < 20 || height < 20) {
    return {
      x: bitmap.width * 0.06,
      y: bitmap.height * 0.18,
      width: bitmap.width * 0.88,
      height: bitmap.height * 0.42
    };
  }

  return { x, y, width, height };
}

async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return `data:${blob.type};base64,${btoa(binary)}`;
}

async function getCollection(id) {
  const [node] = await callApi(api.bookmarks, "get", id);
  const metadata = await readMetadata();
  return normalizeCollectionNode(node, metadata);
}

async function setFonts(collection, fonts) {
  const entries = dedupeEntries(normalizeFonts(fonts));
  await updateStoredEntries(collection.id, entries);
  return callApi(api.bookmarks, "update", collection.id, { url: collectionPageUrl(collection.id) });
}

function collectionPageUrl(id) {
  return api.runtime.getURL(`collection.html?id=${encodeURIComponent(id)}`);
}

async function readMetadata() {
  const result = await callApi(api.storage.local, "get", METADATA_KEY);
  return result[METADATA_KEY] || {};
}

async function updateStoredEntries(collectionId, entries) {
  const metadata = await readMetadata();
  if (entries.length) metadata[collectionId] = { entries };
  else delete metadata[collectionId];
  await callApi(api.storage.local, "set", { [METADATA_KEY]: metadata });
}

function callApi(namespace, method, ...args) {
  if (!globalThis.chrome || globalThis.browser) {
    return namespace[method](...args);
  }

  return new Promise((resolve, reject) => {
    namespace[method](...args, (value) => {
      const error = api.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(value);
    });
  });
}

function normalizeFonts(fonts) {
  return fonts
    .flatMap((font) => {
      if (typeof font === "string") {
        return [{ family: font, source: "google-fonts", sourceName: "Google Fonts" }];
      }
      if (font.entries) return font.entries;
      return [font];
    })
    .filter((font) => font && font.family)
    .map((font) => ({
      source: "google-fonts",
      sourceName: "Google Fonts",
      ...font
    }));
}

function dedupeEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = `${entry.source}:${entry.family}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeCollectionNode(node, metadata) {
  const entries = dedupeEntries(metadata[node.id]?.entries || []);
  return {
    id: node.id,
    title: node.title,
    url: node.url,
    families: entries.map((entry) => entry.family),
    entries
  };
}
