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

  function titleCaseSlug(slug) {
    return decodeFamily(slug)
      .split(/[-\s]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function knownCoTypeSummary(family) {
    if (family.toLowerCase() !== "ambit") return null;
    return {
      category: "Sans serif",
      designer: "Mark Bloom",
      foundry: "CoType Foundry",
      styles: "14 styles",
      formats: ["OTF", "WOFF", "WOFF2", "Variable"],
      tags: ["eccentric", "grotesque", "contemporary", "branding", "editorial"],
      summary: "Ambit is an eccentric contemporary sans serif inspired by early grotesques, with distinctive curly details and a strong branding/editorial personality."
    };
  }

  function parseCoTypeUrl(urlText) {
    const url = new URL(urlText);
    const parts = url.pathname.split("/").filter(Boolean);

    if (url.hostname !== "cotypefoundry.com" || parts[0] !== "our-fonts" || !parts[1]) {
      return null;
    }

    const family = titleCaseSlug(parts[1]);
    const known = knownCoTypeSummary(family);
    return {
      source: "cotype-foundry",
      sourceName: "CoType Foundry",
      sourceUrl: url.href,
      family,
      families: [family],
      entries: [{
        family,
        source: "cotype-foundry",
        sourceName: "CoType Foundry",
        sourceUrl: url.href,
        ...known
      }]
    };
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
      return parseGoogleSpecimenUrl(urlText) || parseCoTypeUrl(urlText);
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
