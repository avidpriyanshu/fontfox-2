const PreviewCapture = (() => {
  async function openSelector(tabId) {
    if (!tabId) throw new Error("No active tab to capture.");

    if (ext.scripting?.executeScript) {
      await ext.scripting.executeScript({
        target: { tabId },
        files: ["src/preview-selector.js"]
      });
      return;
    }

    if (ext.tabs.executeScript) {
      await ext.tabs.executeScript(tabId, { file: "src/preview-selector.js" });
      return;
    }

    throw new Error("Preview selection is not available in this browser.");
  }

  return {
    openSelector
  };
})();
