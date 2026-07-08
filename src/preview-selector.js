(() => {
  const extensionApi = globalThis.browser || globalThis.chrome;
  const existing = document.querySelector("[data-fontfox-preview-selector]");
  if (existing) existing.remove();

  const state = {
    dragging: false,
    startX: 0,
    startY: 0,
    rect: suggestRect()
  };

  const root = document.createElement("div");
  root.dataset.fontfoxPreviewSelector = "true";
  root.innerHTML = `
    <div class="fontfoxShade"></div>
    <div class="fontfoxSelection"></div>
    <div class="fontfoxToolbar">
      <strong>Capture preview</strong>
      <span>Drag over the font preview area.</span>
      <button type="button" data-action="save">Save</button>
      <button type="button" data-action="cancel">Cancel</button>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    [data-fontfox-preview-selector] {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      cursor: crosshair;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    [data-fontfox-preview-selector] .fontfoxShade {
      position: absolute;
      inset: 0;
      background: rgb(0 0 0 / 0.42);
    }

    [data-fontfox-preview-selector] .fontfoxSelection {
      position: absolute;
      border: 2px solid #8ec5ff;
      border-radius: 8px;
      background: rgb(142 197 255 / 0.14);
      box-shadow: 0 0 0 9999px rgb(0 0 0 / 0.28), 0 0 0 1px rgb(0 0 0 / 0.5) inset;
    }

    [data-fontfox-preview-selector] .fontfoxToolbar {
      position: fixed;
      left: 16px;
      bottom: 16px;
      display: grid;
      grid-template-columns: auto auto auto auto;
      align-items: center;
      gap: 10px;
      max-width: calc(100vw - 32px);
      padding: 10px;
      border: 1px solid rgb(255 255 255 / 0.18);
      border-radius: 12px;
      color: #f5f5f5;
      background: #111;
      box-shadow: 0 14px 42px rgb(0 0 0 / 0.45);
      cursor: default;
    }

    [data-fontfox-preview-selector] strong {
      font-size: 13px;
      font-weight: 650;
      white-space: nowrap;
    }

    [data-fontfox-preview-selector] span {
      color: #b8b8b8;
      font-size: 12px;
      white-space: nowrap;
    }

    [data-fontfox-preview-selector] button {
      min-height: 32px;
      padding: 0 12px;
      border: 1px solid rgb(255 255 255 / 0.18);
      border-radius: 8px;
      color: #f5f5f5;
      background: #242424;
      font: inherit;
      font-size: 12px;
      cursor: pointer;
    }

    [data-fontfox-preview-selector] button[data-action="save"] {
      color: #111;
      background: #f5f5f5;
      border-color: #f5f5f5;
      font-weight: 650;
    }

    @media (max-width: 620px) {
      [data-fontfox-preview-selector] .fontfoxToolbar {
        grid-template-columns: 1fr auto auto;
      }

      [data-fontfox-preview-selector] span {
        display: none;
      }
    }
  `;

  root.append(style);
  document.documentElement.append(root);

  const selection = root.querySelector(".fontfoxSelection");
  const toolbar = root.querySelector(".fontfoxToolbar");
  render();

  root.addEventListener("mousedown", (event) => {
    if (toolbar.contains(event.target)) return;
    state.dragging = true;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.rect = { x: event.clientX, y: event.clientY, width: 1, height: 1 };
    render();
    event.preventDefault();
  });

  root.addEventListener("mousemove", (event) => {
    if (!state.dragging) return;
    state.rect = rectFromPoints(state.startX, state.startY, event.clientX, event.clientY);
    render();
  });

  root.addEventListener("mouseup", () => {
    state.dragging = false;
  });

  root.addEventListener("click", (event) => {
    const action = event.target?.dataset?.action;
    if (action === "cancel") cleanup();
    if (action === "save") save();
  });

  document.addEventListener("keydown", onKeydown, true);

  function render() {
    selection.style.left = `${state.rect.x}px`;
    selection.style.top = `${state.rect.y}px`;
    selection.style.width = `${state.rect.width}px`;
    selection.style.height = `${state.rect.height}px`;
  }

  function save() {
    const rect = {
      x: Math.max(0, Math.round(state.rect.x)),
      y: Math.max(0, Math.round(state.rect.y)),
      width: Math.max(1, Math.round(state.rect.width)),
      height: Math.max(1, Math.round(state.rect.height)),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    };

    cleanup();
    extensionApi.runtime.sendMessage({
      type: "fontfox:save-preview-capture",
      rect
    });
  }

  function cleanup() {
    document.removeEventListener("keydown", onKeydown, true);
    root.remove();
  }

  function onKeydown(event) {
    if (event.key === "Escape") cleanup();
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") save();
  }

  function rectFromPoints(x1, y1, x2, y2) {
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1)
    };
  }

  function suggestRect() {
    const candidate = [...document.querySelectorAll("textarea, input[type='text'], input:not([type]), [contenteditable='true'], img, canvas, svg, [style*='font-family'], p, h1, h2, h3, article, section")]
      .map((node) => ({ node, rect: node.getBoundingClientRect(), score: scoreNode(node) }))
      .filter((item) => item.score > 0 && item.rect.width > 80 && item.rect.height > 30)
      .sort((a, b) => b.score - a.score)[0];

    const rect = candidate?.rect || {
      left: window.innerWidth * 0.08,
      top: window.innerHeight * 0.22,
      width: window.innerWidth * 0.84,
      height: window.innerHeight * 0.34
    };

    return {
      x: Math.max(8, rect.left - 12),
      y: Math.max(8, rect.top - 12),
      width: Math.min(window.innerWidth - rect.left - 8, rect.width + 24),
      height: Math.min(window.innerHeight - rect.top - 8, rect.height + 24)
    };
  }

  function scoreNode(node) {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const text = [
      node.getAttribute("aria-label"),
      node.getAttribute("placeholder"),
      node.id,
      node.className,
      node.textContent
    ].filter(Boolean).join(" ").toLowerCase();

    if (style.display === "none" || style.visibility === "hidden") return -100;
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) return -100;
    if (/cookie|privacy|nav|menu|footer|header|login|sign|subscribe|advert/.test(text)) return -100;

    let score = 0;
    if (/preview|sample|specimen|tester|custom|type your|your text|font/.test(text)) score += 60;
    if (node.matches("textarea, input, [contenteditable='true']")) score += 80;
    if (node.matches("img, canvas, svg")) score += 28;
    if ((parseFloat(style.fontSize) || 0) >= 34) score += 30;
    if (rect.width > window.innerWidth * 0.45) score += 15;
    if (rect.height > 420) score -= 25;
    return score;
  }
})();
