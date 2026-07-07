const BookmarkStore = (() => {
  const ROOT_FOLDER_TITLE = "Fonts";
  const EMPTY_COLLECTION_URL = "https://fonts.google.com/";

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
    return children
      .filter((node) => node.url)
      .map((node) => {
        const parsed = FontSources.parseSavedCollection(node.url);
        return {
          id: node.id,
          title: node.title,
          url: node.url,
          families: parsed ? parsed.families : []
        };
      });
  }

  async function createCollection(title, families = []) {
    const root = await getRootFolder();
    return ext.bookmarks.create({
      parentId: root.id,
      title,
      url: families.length ? FontSources.buildGooglePreviewUrl(families) : EMPTY_COLLECTION_URL
    });
  }

  async function addFont(collection, family) {
    const families = [...new Set([...collection.families, family])];
    return updateFamilies(collection, families);
  }

  async function removeFont(collection, family) {
    const families = collection.families.filter((item) => item !== family);
    return updateFamilies(collection, families);
  }

  async function setFonts(collection, families) {
    return updateFamilies(collection, [...new Set(families)]);
  }

  async function renameCollection(collection, title) {
    return ext.bookmarks.update(collection.id, { title });
  }

  async function deleteCollection(collection) {
    return ext.bookmarks.remove(collection.id);
  }

  async function updateFamilies(collection, families) {
    const url = families.length ? FontSources.buildGooglePreviewUrl(families) : EMPTY_COLLECTION_URL;
    return ext.bookmarks.update(collection.id, { url });
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
