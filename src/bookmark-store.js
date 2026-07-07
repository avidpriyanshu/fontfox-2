const BookmarkStore = (() => {
  const ROOT_FOLDER_TITLE = "Fonts";
  const EMPTY_COLLECTION_URL = "https://fonts.google.com/";
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
      .map((node) => {
        const parsed = FontSources.parseSavedCollection(node.url);
        const extraEntries = metadata[node.id]?.entries || [];
        const googleEntries = parsed ? parsed.families.map((family) => ({
          family,
          source: "google-fonts",
          sourceName: "Google Fonts",
          sourceUrl: `https://fonts.google.com/specimen/${encodeURIComponent(family).replace(/%20/g, "+")}`
        })) : [];
        const entries = dedupeEntries([...googleEntries, ...extraEntries]);
        return {
          id: node.id,
          title: node.title,
          url: node.url,
          families: entries.map((entry) => entry.family),
          entries
        };
      });
  }

  async function createCollection(title, fonts = []) {
    const root = await getRootFolder();
    const entries = normalizeFonts(fonts);
    const googleFamilies = entries
      .filter((entry) => entry.source === "google-fonts")
      .map((entry) => entry.family);
    const extraEntries = entries.filter((entry) => entry.source !== "google-fonts");
    const bookmark = await ext.bookmarks.create({
      parentId: root.id,
      title,
      url: googleFamilies.length ? FontSources.buildGooglePreviewUrl(googleFamilies) : EMPTY_COLLECTION_URL
    });

    if (extraEntries.length) await updateStoredEntries(bookmark.id, extraEntries);
    return bookmark;
  }

  async function addFont(collection, family) {
    return setFonts(collection, [...collection.entries, ...normalizeFonts([family])]);
  }

  async function removeFont(collection, family) {
    return setFonts(collection, collection.entries.filter((entry) => entry.family !== family));
  }

  async function setFonts(collection, fonts) {
    const entries = dedupeEntries(normalizeFonts(fonts));
    const googleFamilies = entries
      .filter((entry) => entry.source === "google-fonts")
      .map((entry) => entry.family);
    const extraEntries = entries.filter((entry) => entry.source !== "google-fonts");
    await updateStoredEntries(collection.id, extraEntries);
    return updateFamilies(collection, [...new Set(googleFamilies)]);
  }

  async function renameCollection(collection, title) {
    return ext.bookmarks.update(collection.id, { title });
  }

  async function deleteCollection(collection) {
    await updateStoredEntries(collection.id, []);
    return ext.bookmarks.remove(collection.id);
  }

  async function updateFamilies(collection, families) {
    const url = families.length ? FontSources.buildGooglePreviewUrl(families) : EMPTY_COLLECTION_URL;
    return ext.bookmarks.update(collection.id, { url });
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

  return {
    listCollections,
    createCollection,
    addFont,
    removeFont,
    setFonts,
    renameCollection,
    deleteCollection
  };
})();
