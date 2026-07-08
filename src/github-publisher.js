const GitHubPublisher = (() => {
  const OWNER = "avidpriyanshu";
  const REPO = "fontfox-2";
  const BRANCH = "master";
  const PAGES_BASE_URL = "https://avidpriyanshu.github.io/fontfox-2";
  const API_BASE_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;
  const TOKEN_KEY = "fontfox.githubToken";

  async function publishCollection(collection) {
    const token = await getToken();
    const shareId = shareIdForCollection(collection);
    const entries = [];

    for (const entry of collection.entries) {
      const nextEntry = { ...entry };
      if (isDataImage(entry.previewImage)) {
        const extension = imageExtension(entry.previewImage);
        const previewPath = `previews/${shareId}/${safeFileName(entry.family)}.${extension}`;
        await putFile({
          token,
          path: previewPath,
          content: dataUrlToBase64(entry.previewImage),
          message: `Publish preview for ${collection.title}`,
          contentType: "base64"
        });
        nextEntry.previewImage = `${PAGES_BASE_URL}/${previewPath}`;
      }
      entries.push(nextEntry);
    }

    const payload = {
      title: collection.title,
      publishedAt: new Date().toISOString(),
      entries
    };

    await putFile({
      token,
      path: `shares/${shareId}.json`,
      content: JSON.stringify(payload, null, 2),
      message: `Publish shared collection ${collection.title}`,
      contentType: "utf8"
    });

    return `${PAGES_BASE_URL}/collection.html?shareId=${encodeURIComponent(shareId)}`;
  }

  async function getToken() {
    const stored = await readStoredToken();
    if (stored) return stored;

    const token = prompt("GitHub token for publishing shares");
    if (!token?.trim()) throw new Error("GitHub token is required to publish.");
    const value = token.trim();
    await writeStoredToken(value);
    return value;
  }

  async function readStoredToken() {
    if (!globalThis.browser && !globalThis.chrome) return "";
    const result = await ext.storage.local.get(TOKEN_KEY);
    return result[TOKEN_KEY] || "";
  }

  async function writeStoredToken(token) {
    if (!globalThis.browser && !globalThis.chrome) return;
    await ext.storage.local.set({ [TOKEN_KEY]: token });
  }

  async function putFile({ token, path, content, message, contentType }) {
    const existing = await getExistingFile(token, path);
    const response = await fetch(`${API_BASE_URL}/${encodePath(path)}`, {
      method: "PUT",
      headers: githubHeaders(token),
      body: JSON.stringify({
        message,
        content: contentType === "base64" ? content : utf8ToBase64(content),
        branch: BRANCH,
        sha: existing?.sha
      })
    });

    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.message || `GitHub upload failed for ${path}.`);
    }

    return response.json();
  }

  async function getExistingFile(token, path) {
    const response = await fetch(`${API_BASE_URL}/${encodePath(path)}?ref=${encodeURIComponent(BRANCH)}`, {
      headers: githubHeaders(token)
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.message || `Could not check ${path}.`);
    }
    return response.json();
  }

  function githubHeaders(token) {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  function shareIdForCollection(collection) {
    const base = safeFileName(collection.title || "collection");
    const suffix = collection.id || hashText(JSON.stringify(collection.entries.map((entry) => entry.family)));
    return `${base}-${safeFileName(String(suffix)).slice(0, 24)}`;
  }

  function safeFileName(name) {
    return (name || "fontfox")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "fontfox";
  }

  function hashText(text) {
    let hash = 5381;
    for (const char of text) hash = ((hash << 5) + hash) + char.charCodeAt(0);
    return Math.abs(hash >>> 0).toString(36);
  }

  function encodePath(path) {
    return path.split("/").map(encodeURIComponent).join("/");
  }

  function isDataImage(value) {
    return typeof value === "string" && value.startsWith("data:image/");
  }

  function imageExtension(dataUrl) {
    const match = dataUrl.match(/^data:image\/([a-z0-9.+-]+);base64,/i);
    if (!match) return "jpg";
    if (match[1] === "jpeg") return "jpg";
    return match[1].replace("+xml", "");
  }

  function dataUrlToBase64(dataUrl) {
    return dataUrl.split(",")[1] || "";
  }

  function utf8ToBase64(text) {
    return btoa(unescape(encodeURIComponent(text)));
  }

  return {
    publishCollection
  };
})();
