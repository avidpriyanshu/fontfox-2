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

console.log("font source tests passed");
