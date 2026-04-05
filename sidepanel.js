let cropperInstance = null;
let finalBlob = null;

async function loadCurrentImage() {
  const resp = await chrome.runtime.sendMessage({ action: "getCurrentImage" });
  if (!resp?.image) {
    document.getElementById("preview-wrapper").innerHTML =
      `<p style="color:#aaa;text-align:center;padding:40px;">No image yet.<br>Click the LensSnap icon to capture.</p>`;
    return;
  }

  const img = document.getElementById("preview");
  img.src = resp.image;

  img.onload = () => {
    cropperInstance = new Cropper(img, {
      aspectRatio: NaN,
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
}

function dataURLtoBlob(dataUrl) {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

// Confirm crop
document.getElementById("confirm-crop").addEventListener("click", () => {
  if (!cropperInstance) return;

  const canvas = cropperInstance.getCroppedCanvas({
    imageSmoothingQuality: "high",
  });
  const croppedDataUrl = canvas.toDataURL("image/png", 0.95);

  finalBlob = dataURLtoBlob(croppedDataUrl);

  // Replace with final cropped image (static)
  const wrapper = document.getElementById("preview-wrapper");
  wrapper.innerHTML = `<img src="${croppedDataUrl}" style="max-width:100%; border-radius:8px;">`;

  document.getElementById("crop-controls").classList.add("hidden");
  document.getElementById("search-panel").classList.remove("hidden");

  cropperInstance.destroy();
});

// Search engine buttons
document.querySelectorAll(".engines button").forEach((btn) => {
  btn.addEventListener("click", async () => {
    if (!finalBlob) return;

    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": finalBlob }),
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
      console.error(err);
    }
  });
});

// Recapture
document.getElementById("recapture").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "startCapture" }); // optional – you can extend service-worker to re-inject overlay
  // For now, user can just click the browser icon again
});

window.onload = loadCurrentImage;
