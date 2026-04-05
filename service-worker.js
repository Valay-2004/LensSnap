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

chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id) return;
  
  // CRITICAL: Open side panel SYNCHRONOUSLY to preserve user gesture
  chrome.sidePanel.open({ windowId: tab.windowId }).catch((err) => {
    console.error("Side panel open error:", err);
  });
  
  // Then inject overlay (no await needed for the next step)
  injectOverlay(tab.id);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "captureRegion") {
    const { coords, devicePixelRatio: dpr } = message;
    const windowId = sender.tab.windowId;

    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, async (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        sendResponse({ status: "error", message: chrome.runtime.lastError.message });
        return;
      }
      try {
        currentImageDataUrl = await cropImage(dataUrl, coords, dpr);
        // Side panel is already open, so we just acknowledge
        sendResponse({ status: "ok" });
        
        // Broadcast to all (including sidepanel) that a capture is ready
        chrome.runtime.sendMessage({ action: "refreshSidePanel" });
      } catch (e) {
        console.error("Crop error:", e);
        sendResponse({ status: "error", message: e.message });
      }
    });
    return true; // async response
  }

  if (message.action === "getCurrentImage") {
    sendResponse({ image: currentImageDataUrl });
    // Note: If you want to keep the image visible in the sidepanel during 
    // multiple actions, you might not want to clear it here every time.
    // For now, let's keep it until another capture starts or window closes.
    return true;
  }

  if (message.action === "startCapture") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        injectOverlay(tabs[0].id);
      }
    });
    return true;
  }
});
