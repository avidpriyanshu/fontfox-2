(() => {
  if (globalThis.browser) {
    globalThis.ext = globalThis.browser;
    return;
  }

  if (!globalThis.chrome) {
    globalThis.ext = {
      runtime: {
        getURL: (path) => new URL(path, location.href).href
      }
    };
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
    runtime: {
      ...chrome.runtime,
      getURL: chrome.runtime.getURL.bind(chrome.runtime),
      sendMessage: (...args) => new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(...args, (result) => {
          const error = chrome.runtime && chrome.runtime.lastError;
          if (error) reject(new Error(error.message));
          else resolve(result);
        });
      })
    },
    scripting: chrome.scripting ? promisifyNamespace(chrome.scripting) : null,
    storage: {
      local: promisifyNamespace(chrome.storage.local)
    },
    tabs: promisifyNamespace(chrome.tabs)
  };
})();
