const fs = require("fs");
const vm = require("vm");
const assert = require("assert");
const path = require("path");

const fontSourcesSource = fs.readFileSync(path.join(__dirname, "../src/font-sources.js"), "utf8");
const bookmarkStoreSource = fs.readFileSync(path.join(__dirname, "../src/bookmark-store.js"), "utf8");

let bookmarks = [];
let metadata = {};
let nextId = 1;

const context = {
  URL,
  console,
  ext: {
    bookmarks: {
      async search() {
        return [{ id: "root", title: "Fonts" }];
      },
      async getChildren() {
        return bookmarks;
      },
      async get(id) {
        return bookmarks.filter((bookmark) => bookmark.id === id);
      },
      async create(bookmark) {
        const node = { id: String(nextId++), ...bookmark };
        bookmarks.push(node);
        return node;
      },
      async update(id, changes) {
        const node = bookmarks.find((bookmark) => bookmark.id === id);
        Object.assign(node, changes);
        return node;
      },
      async remove(id) {
        bookmarks = bookmarks.filter((bookmark) => bookmark.id !== id);
      }
    },
    storage: {
      local: {
        async get(key) {
          return { [key]: metadata };
        },
        async set(value) {
          metadata = value["fontfox.collectionMetadata"];
        }
      }
    },
    runtime: {
      getURL(path) {
        return `moz-extension://fontfox-test/${path}`;
      }
    }
  }
};

vm.createContext(context);
vm.runInContext(`${fontSourcesSource}; globalThis.FontSources = FontSources;`, context);
vm.runInContext(`${bookmarkStoreSource}; globalThis.BookmarkStore = BookmarkStore;`, context);

const { BookmarkStore } = context;

(async () => {
  const collection = await BookmarkStore.createCollection("Google start", ["Roboto"]);
  assert.equal(collection.url, "moz-extension://fontfox-test/collection.html?id=1");

  const [listed] = await BookmarkStore.listCollections();
  assert.equal(listed.url, "moz-extension://fontfox-test/collection.html?id=1");
  assert.deepEqual(listed.families, ["Roboto"]);
  assert.equal(listed.entries[0].source, "google-fonts");

  console.log("bookmark store tests passed");
})();
