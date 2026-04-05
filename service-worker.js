let currentImageDataUrl = null;

async function cropImage(dataUrl, coords, dpr) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  const sx = Math.round(coords.x * dpr);
  const sy = Math.round(coords.y * dpr);
  const sw = Math.round(coords.w * dpr);
  const sh = Math.round(coords.h * dpr);

  const offscreen = new OffscreenCanvas(sw, sh);
  const ctx = offscreen.getContext("2d");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);

  const croppedBlob = await offscreen.convertToBlob({ type: "image/png" });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(croppedBlob);
  });
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  // Inject region selector
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["overlay.js"],
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "captureRegion") {
    const { coords, devicePixelRatio: dpr, tabId } = message;

    chrome.tabs.captureVisibleTab(tabId, { format: "png" }, async (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }
      try {
        currentImageDataUrl = await cropImage(dataUrl, coords, dpr);
        // Open side panel automatically
        chrome.sidePanel.open({ tabId });
        sendResponse({ status: "ok" });
      } catch (e) {
        console.error(e);
      }
    });
    return true; // async response
  }

  if (message.action === "getCurrentImage") {
    sendResponse({ image: currentImageDataUrl });
    return true;
  }
});
