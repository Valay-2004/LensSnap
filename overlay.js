(() => {
  if (document.getElementById("lenssnap-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "lenssnap-overlay";
  overlay.style.cssText = `
    position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.35);
    z-index:2147483647; cursor:crosshair; display:flex; align-items:center; justify-content:center;
    flex-direction:column; color:#fff; font-family:system-ui; pointer-events:all;
  `;
  overlay.innerHTML = `
    <div style="background:rgba(0,0,0,0.85); padding:24px 32px; border-radius:12px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
      <h2 style="margin:0 0 8px;">Select Region</h2>
      <p style="margin:0 0 16px; opacity:0.9;">Drag to capture any area</p>
      <p style="font-size:13px; opacity:0.6;">ESC to cancel</p>
    </div>
  `;
  document.documentElement.appendChild(overlay);

  const box = document.createElement("div");
  box.style.cssText = `position:absolute; border:2px solid #00ff88; background:rgba(0,255,136,0.15); pointer-events:none; display:none; z-index:2147483648; box-shadow:0 0 0 9999px rgba(0,0,0,0.4);`;
  document.documentElement.appendChild(box);

  let isDragging = false;
  let startX = 0,
    startY = 0;

  const cleanup = () => {
    overlay.remove();
    box.remove();
  };

  overlay.addEventListener("mousedown", (e) => {
    if (e.target !== overlay) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    box.style.left = startX + "px";
    box.style.top = startY + "px";
    box.style.width = "0";
    box.style.height = "0";
    box.style.display = "block";
  });

  overlay.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const left = Math.min(startX, e.clientX);
    const top = Math.min(startY, e.clientY);
    const width = Math.abs(e.clientX - startX);
    const height = Math.abs(e.clientY - startY);

    box.style.left = left + "px";
    box.style.top = top + "px";
    box.style.width = width + "px";
    box.style.height = height + "px";
  });

  overlay.addEventListener("mouseup", (e) => {
    if (!isDragging) return;
    isDragging = false;

    const left = Math.min(startX, e.clientX);
    const top = Math.min(startY, e.clientY);
    const width = Math.abs(e.clientX - startX);
    const height = Math.abs(e.clientY - startY);

    if (width < 20 || height < 20) {
      alert("Selection too small");
      cleanup();
      return;
    }

    chrome.runtime.sendMessage({
      action: "captureRegion",
      coords: { x: left, y: top, w: width, h: height },
      devicePixelRatio: window.devicePixelRatio || 1,
      tabId: chrome.runtime.id ? undefined : undefined, // tabId not needed here
    });

    cleanup();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cleanup();
  });
})();
