const fs = require("fs");
const vm = require("vm");
const assert = require("assert");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "../src/font-sources.js"), "utf8");
const context = { URL, console };
vm.createContext(context);
vm.runInContext(`${source}; globalThis.FontSources = FontSources;`, context);

const { FontSources } = context;

const shareUrl = FontSources.buildGooglePreviewUrl(["Geist Pixel", "Google Sans"]);
assert.equal(
  shareUrl,
  "https://fonts.google.com/share?selection.family=Geist+Pixel|Google+Sans"
);

assert.deepEqual(
  FontSources.parseSavedCollection(shareUrl).families,
  ["Geist Pixel", "Google Sans"]
);

assert.deepEqual(
  FontSources.parseSavedCollection("https://fonts.google.com/share?family=Geist%2BPixel&family=Google%2BSans").families,
  ["Geist Pixel", "Google Sans"]
);

assert.deepEqual(
  FontSources.parseSavedCollection("https://fonts.google.com/share?selection.family=Geist+Pixel|Google+Sans").families,
  ["Geist Pixel", "Google Sans"]
);

assert.equal(FontSources.parseCurrentPage(shareUrl), null);
assert.deepEqual(
  FontSources.parseCurrentPage("https://fonts.google.com/specimen/Geist+Pixel").families,
  ["Geist Pixel"]
);

const ambit = FontSources.parseCurrentPage("https://cotypefoundry.com/our-fonts/ambit");
assert.equal(ambit.family, "Ambit");
assert.equal(ambit.source, "cotype-foundry");
assert.equal(ambit.entries[0].sourceName, "CoType Foundry");
assert.equal(ambit.entries[0].designer, "Mark Bloom");
assert.equal(ambit.entries[0].foundry, "CoType Foundry");
assert.equal(ambit.entries[0].category, "Sans serif");
assert.ok(ambit.entries[0].summary.includes("eccentric contemporary sans serif"));

const adobe = FontSources.parseCurrentPage("https://fonts.adobe.com/fonts/callifont-shouting");
assert.equal(adobe.family, "Callifont Shouting");
assert.equal(adobe.source, "adobe-fonts");
assert.equal(adobe.entries[0].sourceName, "Adobe Fonts");

const dafont = FontSources.parseCurrentPage("https://www.dafont.com/bebas-neue.font");
assert.equal(dafont.family, "Bebas Neue");
assert.equal(dafont.source, "dafont");

const fonts1001 = FontSources.parseCurrentPage("https://www.1001fonts.com/coolvetica-font.html");
assert.equal(fonts1001.family, "Coolvetica");
assert.equal(fonts1001.source, "1001-fonts");

const sneak = FontSources.parseCurrentPage("https://tightype.com/typefaces/sneak/");
assert.equal(sneak.family, "Sneak");
assert.equal(sneak.source, "tightype");
assert.equal(sneak.entries[0].sourceName, "Tightype");
assert.equal(sneak.entries[0].foundry, "Tightype");
assert.equal(sneak.entries[0].styles, "11 styles");
assert.ok(sneak.entries[0].summary.includes("neo-grotesque typeface"));

const klim = FontSources.parseCurrentPage("https://klim.co.nz/retail-fonts/soehne/");
assert.equal(klim.family, "Soehne");
assert.equal(klim.source, "klim-type-foundry");
assert.equal(klim.entries[0].sourceName, "Klim Type Foundry");

const commercial = FontSources.parseCurrentPage("https://commercialtype.com/catalog/graphik");
assert.equal(commercial.family, "Graphik");
assert.equal(commercial.source, "commercial-type");

const typeToday = FontSources.parseCurrentPage("https://type.today/en/fonts/gerbera");
assert.equal(typeToday.family, "Gerbera");
assert.equal(typeToday.source, "type-today");

const futureFonts = FontSources.parseCurrentPage("https://www.futurefonts.xyz/typefaces/name-sans");
assert.equal(futureFonts.family, "Name Sans");
assert.equal(futureFonts.source, "future-fonts");

console.log("font source tests passed");
