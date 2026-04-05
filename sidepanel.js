let cropperInstance = null;
let finalBlob = null;

async function loadCurrentImage() {
  const resp = await chrome.runtime.sendMessage({ action: "getCurrentImage" });
  const wrapper = document.getElementById("preview-wrapper");
  
  if (!resp?.image) {
    wrapper.innerHTML = `<div class="empty-state">
      <p>No image yet.</p>
      <span>Click the LensSnap icon to capture.</span>
    </div>`;
    return;
  }

  // Clear wrapper and create preview image
  wrapper.innerHTML = '';
  const img = document.createElement("img");
  img.id = "preview";
  img.alt = "Captured image";
  wrapper.appendChild(img);

  // Destroy previous instance if it exists
  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }

  // Set onload BEFORE src to handle cached data URLs
  img.onload = () => {
    cropperInstance = new Cropper(img, {
      viewMode: 1,
      autoCropArea: 0.9,
      responsive: true,
      guides: true,
      background: false,
      zoomable: true,
      rotatable: true,
      scalable: true,
    });
  };
  
  img.src = resp.image;
  
  // Show crop controls, hide search panel
  document.getElementById("crop-controls").classList.remove("hidden");
  document.getElementById("search-panel").classList.add("hidden");
}

// Confirm crop
document.getElementById("confirm-crop").addEventListener("click", () => {
  if (!cropperInstance) return;

  const canvas = cropperInstance.getCroppedCanvas({
    imageSmoothingQuality: "high",
  });
  
  // Use toBlob directly for better performance and memory management
  canvas.toBlob((blob) => {
    finalBlob = blob;
    const croppedDataUrl = URL.createObjectURL(blob);

    // Replace with final cropped image (static)
    const wrapper = document.getElementById("preview-wrapper");
    wrapper.innerHTML = '';
    const finalImg = document.createElement("img");
    finalImg.src = croppedDataUrl;
    finalImg.classList.add("cropped-result");
    wrapper.appendChild(finalImg);

    document.getElementById("crop-controls").classList.add("hidden");
    document.getElementById("search-panel").classList.remove("hidden");

    cropperInstance.destroy();
    cropperInstance = null;
  }, "image/png");
});

// Search engine buttons
document.querySelectorAll(".engines button").forEach((btn) => {
  btn.addEventListener("click", async () => {
    if (!finalBlob) return;

    try {
      // Write to clipboard as file
      await navigator.clipboard.write([
        new ClipboardItem({ [finalBlob.type]: finalBlob }),
      ]);

      let url = "";
      switch (btn.dataset.engine) {
        case "google":
          url = "https://lens.google.com/";
          break;
        case "yandex":
          url = "https://yandex.com/images/search";
          break;
        case "bing":
          url = "https://www.bing.com/images/search?view=detailv2";
          break;
        case "tineye":
          url = "https://tineye.com/";
          break;
      }
      chrome.tabs.create({ url });
    } catch (err) {
      console.error("Clipboard write error/Search failed:", err);
    }
  });
});

// Recapture
document.getElementById("recapture").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "startCapture" });
});

window.addEventListener("load", loadCurrentImage);

// Listen for new captures to refresh the side panel automatically
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "captureRegion" || message.action === "refreshSidePanel") {
    // Small delay to ensure the data is set in service worker
    setTimeout(loadCurrentImage, 100);
  }
});
