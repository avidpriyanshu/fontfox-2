const FontSources = (() => {
  const GOOGLE_PREVIEW_BASE = "https://fonts.google.com/share";

  function decodeFamily(rawFamily) {
    return decodeURIComponent(rawFamily || "")
      .replace(/\+/g, " ")
      .replace(/:/g, " ")
      .trim();
  }

  function parseGoogleSpecimenUrl(urlText) {
    const url = new URL(urlText);

    if (url.hostname === "fonts.google.com" && url.pathname.startsWith("/specimen/")) {
      const family = decodeFamily(url.pathname.split("/").filter(Boolean)[1]);
      return family ? { source: "google-fonts", family, families: [family] } : null;
    }

    return null;
  }

  function parseCollectionUrl(urlText) {
    const url = new URL(urlText);

    if (url.hostname === "fonts.google.com" && url.pathname === "/share") {
      const familyParams = url.searchParams.has("selection.family")
        ? [url.searchParams.get("selection.family")]
        : url.searchParams.getAll("family");

      const families = familyParams
        .filter(Boolean)
        .flatMap((family) => family.split("|"))
        .map(decodeFamily)
        .filter(Boolean);

      return families.length ? { source: "google-fonts", family: families[0], families } : null;
    }

    if (url.hostname === "fonts.googleapis.com") {
      const families = url.searchParams.getAll("family")
        .flatMap((family) => family.split("|"))
        .map(decodeFamily)
        .filter(Boolean);

      return families.length ? { source: "google-fonts-css", family: families[0], families } : null;
    }

    return null;
  }

  function parseCurrentPage(urlText) {
    try {
      return parseGoogleSpecimenUrl(urlText);
    } catch {
      return null;
    }
  }

  function parseSavedCollection(urlText) {
    try {
      return parseCollectionUrl(urlText);
    } catch {
      return null;
    }
  }

  function buildGooglePreviewUrl(families) {
    const url = new URL(GOOGLE_PREVIEW_BASE);
    const fontString = [...new Set(families)]
      .sort((a, b) => a.localeCompare(b))
      .join("|");
    url.searchParams.set("selection.family", fontString);
    url.search = decodeURIComponent(url.search);
    return url.toString();
  }

  return {
    parseCurrentPage,
    parseSavedCollection,
    buildGooglePreviewUrl
  };
})();
