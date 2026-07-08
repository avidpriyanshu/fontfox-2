const BookmarkStore = (() => {
  const ROOT_FOLDER_TITLE = "Fonts";
  const METADATA_KEY = "fontfox.collectionMetadata";

  async function getRootFolder() {
    const matches = await ext.bookmarks.search({ title: ROOT_FOLDER_TITLE });
    const folder = matches.find((node) => !node.url);
    if (folder) return folder;

    return ext.bookmarks.create({
      title: ROOT_FOLDER_TITLE
    });
  }

  async function listCollections() {
    const root = await getRootFolder();
    const children = await ext.bookmarks.getChildren(root.id);
    const metadata = await readMetadata();
    return children
      .filter((node) => node.url)
      .map((node) => normalizeCollectionNode(node, metadata));
  }

  async function getCollection(id) {
    const [node] = await ext.bookmarks.get(id);
    if (!node || !node.url) return null;
    const metadata = await readMetadata();
    return normalizeCollectionNode(node, metadata);
  }

  async function createCollection(title, fonts = []) {
    const root = await getRootFolder();
    const entries = normalizeFonts(fonts);
    const bookmark = await ext.bookmarks.create({
      parentId: root.id,
      title,
      url: collectionPageUrl()
    });

    await ext.bookmarks.update(bookmark.id, { url: collectionPageUrl(bookmark.id) });
    if (entries.length) await updateStoredEntries(bookmark.id, entries);
    return { ...bookmark, url: collectionPageUrl(bookmark.id) };
  }

  async function addFont(collection, family) {
    return setFonts(collection, [...collection.entries, ...normalizeFonts([family])]);
  }

  async function removeFont(collection, family) {
    return setFonts(collection, collection.entries.filter((entry) => entry.family !== family));
  }

  async function setFonts(collection, fonts) {
    const entries = dedupeEntries(normalizeFonts(fonts));
    await updateStoredEntries(collection.id, entries);
    return updateFamilies(collection);
  }

  async function renameCollection(collection, title) {
    return ext.bookmarks.update(collection.id, { title });
  }

  async function deleteCollection(collection) {
    await updateStoredEntries(collection.id, []);
    return ext.bookmarks.remove(collection.id);
  }

  async function updateFamilies(collection) {
    return ext.bookmarks.update(collection.id, { url: collectionPageUrl(collection.id) });
  }

  function collectionPageUrl(id = "") {
    const path = id
      ? `collection.html?id=${encodeURIComponent(id)}`
      : "collection.html";
    return ext.runtime.getURL(path);
  }

  async function readMetadata() {
    const result = await ext.storage.local.get(METADATA_KEY);
    return result[METADATA_KEY] || {};
  }

  async function writeMetadata(metadata) {
    await ext.storage.local.set({ [METADATA_KEY]: metadata });
  }

  async function updateStoredEntries(collectionId, entries) {
    const metadata = await readMetadata();
    if (entries.length) metadata[collectionId] = { entries };
    else delete metadata[collectionId];
    await writeMetadata(metadata);
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
    const parsed = FontSources.parseSavedCollection(node.url);
    const storedEntries = metadata[node.id]?.entries || [];
    const googleEntries = parsed ? parsed.families.map((family) => ({
      family,
      source: "google-fonts",
      sourceName: "Google Fonts",
      sourceUrl: `https://fonts.google.com/specimen/${encodeURIComponent(family).replace(/%20/g, "+")}`
    })) : [];
    const entries = dedupeEntries([...storedEntries, ...googleEntries]);
    return {
      id: node.id,
      title: node.title,
      url: node.url,
      families: entries.map((entry) => entry.family),
      entries
    };
  }

  return {
    listCollections,
    getCollection,
    createCollection,
    addFont,
    removeFont,
    setFonts,
    renameCollection,
    deleteCollection
  };
})();
