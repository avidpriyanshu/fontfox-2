(() => {
  if (globalThis.browser) {
    globalThis.ext = globalThis.browser;
    return;
  }

  const promisifyNamespace = (namespace) => new Proxy(namespace, {
    get(target, prop) {
      const value = target[prop];
      if (typeof value !== "function") return value;
      return (...args) => new Promise((resolve, reject) => {
        value.call(target, ...args, (result) => {
          const error = chrome.runtime && chrome.runtime.lastError;
          if (error) reject(new Error(error.message));
          else resolve(result);
        });
      });
    }
  });

  globalThis.ext = {
    bookmarks: promisifyNamespace(chrome.bookmarks),
    storage: {
      local: promisifyNamespace(chrome.storage.local)
    },
    tabs: promisifyNamespace(chrome.tabs)
  };
})();
