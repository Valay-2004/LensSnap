let currentImageDataUrl = null;

async function cropImage(dataUrl, coords, dpr) {
  // Directly convert dataUrl to ImageBitmap
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);

  const sx = Math.round(coords.x * dpr);
  const sy = Math.round(coords.y * dpr);
  const sw = Math.round(coords.w * dpr);
  const sh = Math.round(coords.h * dpr);

  const offscreen = new OffscreenCanvas(sw, sh);
  const ctx = offscreen.getContext("2d");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
  
  // Free GPU memory
  bitmap.close();

  const croppedBlob = await offscreen.convertToBlob({ type: "image/png" });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(croppedBlob);
  });
}

async function injectOverlay(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["overlay.js"],
  });
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  await injectOverlay(tab.id);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "captureRegion") {
    const { coords, devicePixelRatio: dpr } = message;
    const tabId = sender.tab.id;
    const windowId = sender.tab.windowId;

    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, async (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        sendResponse({ status: "error", message: chrome.runtime.lastError.message });
        return;
      }
      try {
        currentImageDataUrl = await cropImage(dataUrl, coords, dpr);
        // Open side panel automatically for the correct window
        await chrome.sidePanel.open({ windowId });
        sendResponse({ status: "ok" });
      } catch (e) {
        console.error(e);
        sendResponse({ status: "error", message: e.message });
      }
    });
    return true; // async response
  }

  if (message.action === "getCurrentImage") {
    sendResponse({ image: currentImageDataUrl });
    // Clear after serving to free memory
    currentImageDataUrl = null;
    return true;
  }

  if (message.action === "startCapture") {
    // If sent from the sidepanel, we want to capture the currently active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        injectOverlay(tabs[0].id);
      }
    });
    return true;
  }
});
