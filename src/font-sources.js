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

  function makeEntry({ source, sourceName, sourceUrl, family, foundry, extra = {} }) {
    return {
      family,
      source,
      sourceName,
      sourceUrl,
      ...(foundry ? { foundry } : {}),
      ...extra
    };
  }

  function makeSourceResult(sourceConfig, sourceUrl, family, extra = {}) {
    const entry = makeEntry({
      source: sourceConfig.source,
      sourceName: sourceConfig.sourceName,
      sourceUrl,
      family,
      foundry: sourceConfig.foundry,
      extra
    });

    return {
      source: sourceConfig.source,
      sourceName: sourceConfig.sourceName,
      sourceUrl,
      family,
      families: [family],
      entries: [entry]
    };
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

  function knownTightypeSummary(family) {
    if (family.toLowerCase() !== "sneak") return null;
    return {
      category: "Sans serif",
      foundry: "Tightype",
      styles: "11 styles",
      formats: ["OTF", "WOFF", "WOFF2"],
      tags: ["neo-grotesque", "monospaced", "reversed characters", "stylistic sets"],
      summary: "Sneak is a neo-grotesque typeface with distinctive reversed characters. It includes five weights with matching italics and a monospaced style."
    };
  }

  const fontPageSources = [
    {
      hostnames: ["tightype.com", "www.tightype.com"],
      pathPrefixes: ["typefaces"],
      source: "tightype",
      sourceName: "Tightype",
      foundry: "Tightype",
      knownSummary: knownTightypeSummary
    },
    {
      hostnames: ["klim.co.nz", "www.klim.co.nz"],
      pathPrefixes: ["retail-fonts"],
      source: "klim-type-foundry",
      sourceName: "Klim Type Foundry",
      foundry: "Klim Type Foundry"
    },
    {
      hostnames: ["commercialtype.com", "www.commercialtype.com"],
      pathPrefixes: ["catalog"],
      source: "commercial-type",
      sourceName: "Commercial Type",
      foundry: "Commercial Type"
    },
    {
      hostnames: ["typotheque.com", "www.typotheque.com"],
      pathPrefixes: ["fonts"],
      source: "typotheque",
      sourceName: "Typotheque",
      foundry: "Typotheque"
    },
    {
      hostnames: ["type.today", "www.type.today"],
      pathPrefixes: ["en", "fonts"],
      source: "type-today",
      sourceName: "Type.today",
      foundry: "Type.today"
    },
    {
      hostnames: ["ohnotype.co", "www.ohnotype.co"],
      pathPrefixes: ["fonts"],
      source: "ohno-type",
      sourceName: "OH no Type Co.",
      foundry: "OH no Type Co."
    },
    {
      hostnames: ["futurefonts.xyz", "www.futurefonts.xyz"],
      pathPrefixes: ["typefaces"],
      source: "future-fonts",
      sourceName: "Future Fonts",
      foundry: "Future Fonts"
    },
    {
      hostnames: ["velvetyne.fr", "www.velvetyne.fr"],
      pathPrefixes: ["fonts"],
      source: "velvetyne",
      sourceName: "Velvetyne",
      foundry: "Velvetyne"
    },
    {
      hostnames: ["pangrampangram.com", "www.pangrampangram.com"],
      pathPrefixes: ["products"],
      source: "pangram-pangram",
      sourceName: "Pangram Pangram",
      foundry: "Pangram Pangram"
    },
    {
      hostnames: ["fontshare.com", "www.fontshare.com"],
      pathPrefixes: ["fonts"],
      source: "fontshare",
      sourceName: "Fontshare",
      foundry: "Fontshare"
    }
  ];

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
        foundry: "CoType Foundry",
        ...known
      }]
    };
  }

  function parseAdobeFontsUrl(urlText) {
    const url = new URL(urlText);
    const parts = url.pathname.split("/").filter(Boolean);

    if (url.hostname !== "fonts.adobe.com" || parts[0] !== "fonts" || !parts[1]) {
      return null;
    }

    const family = titleCaseSlug(parts[1]);
    return {
      source: "adobe-fonts",
      sourceName: "Adobe Fonts",
      sourceUrl: url.href,
      family,
      families: [family],
      entries: [{
        family,
        source: "adobe-fonts",
        sourceName: "Adobe Fonts",
        sourceUrl: url.href
      }]
    };
  }

  function parseDaFontUrl(urlText) {
    const url = new URL(urlText);
    const match = url.pathname.match(/^\/([^/]+)\.font$/);

    if (!url.hostname.endsWith("dafont.com") || !match) return null;

    const family = titleCaseSlug(match[1]);
    return {
      source: "dafont",
      sourceName: "DaFont",
      sourceUrl: url.href,
      family,
      families: [family],
      entries: [{
        family,
        source: "dafont",
        sourceName: "DaFont",
        sourceUrl: url.href
      }]
    };
  }

  function parse1001FontsUrl(urlText) {
    const url = new URL(urlText);
    const match = url.pathname.match(/^\/([^/]+)-font\.html$/);

    if (url.hostname !== "www.1001fonts.com" || !match) return null;

    const family = titleCaseSlug(match[1]);
    return {
      source: "1001-fonts",
      sourceName: "1001 Fonts",
      sourceUrl: url.href,
      family,
      families: [family],
      entries: [{
        family,
        source: "1001-fonts",
        sourceName: "1001 Fonts",
        sourceUrl: url.href
      }]
    };
  }

  function parseConfiguredFontPageUrl(urlText) {
    const url = new URL(urlText);
    const parts = url.pathname.split("/").filter(Boolean);
    const sourceConfig = fontPageSources.find((config) => (
      config.hostnames.includes(url.hostname)
      && parts.length > config.pathPrefixes.length
      && config.pathPrefixes.every((part, index) => parts[index] === part)
    ));

    if (!sourceConfig) return null;

    const familySlug = parts[sourceConfig.pathPrefixes.length];
    const family = titleCaseSlug(familySlug);
    const extra = sourceConfig.knownSummary?.(family) || {};
    return family ? makeSourceResult(sourceConfig, url.href, family, extra) : null;
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
      return parseGoogleSpecimenUrl(urlText)
        || parseCoTypeUrl(urlText)
        || parseAdobeFontsUrl(urlText)
        || parseDaFontUrl(urlText)
        || parse1001FontsUrl(urlText)
        || parseConfiguredFontPageUrl(urlText);
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
