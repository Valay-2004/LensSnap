(() => {
  if (document.getElementById("lenssnap-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "lenssnap-overlay";
  overlay.style.cssText = `
    position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.35);
    z-index:2147483647; cursor:crosshair; display:flex; align-items:center; justify-content:center;
    flex-direction:column; color:#fff; font-family:system-ui, -apple-system, sans-serif; pointer-events:all;
  `;

  const instructionCard = document.createElement("div");
  instructionCard.style.cssText = `
    background:rgba(0,0,0,0.85); padding:24px 32px; border-radius:12px; text-align:center; 
    box-shadow:0 10px 30px rgba(0,0,0,0.5); pointer-events:none;
  `;
  instructionCard.innerHTML = `
    <h2 style="margin:0 0 8px; font-weight: 500;">Select Region</h2>
    <p style="margin:0 0 16px; opacity:0.9;">Drag to capture any area</p>
    <p style="font-size:13px; opacity:0.6;">ESC to cancel</p>
  `;
  overlay.appendChild(instructionCard);
  document.documentElement.appendChild(overlay);

  const box = document.createElement("div");
  // Z-index fixed to 2147483646 (just below overlay top or safe range)
  box.style.cssText = `position:absolute; border:2px solid #00ff88; background:rgba(0,255,136,0.15); pointer-events:none; display:none; z-index:2147483646; box-shadow:0 0 0 9999px rgba(0,0,0,0.4); transition: border-color 0.2s;`;
  document.documentElement.appendChild(box);

  let isDragging = false;
  let startX = 0,
    startY = 0;

  const cleanup = () => {
    overlay.remove();
    box.remove();
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  const showToast = (message) => {
    const toast = document.createElement("div");
    toast.style.cssText = `position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#333; color:#fff; padding:10px 20px; border-radius:24px; z-index:2147483647; font-size:14px; box-shadow:0 4px 12px rgba(0,0,0,0.3);`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.5s";
      setTimeout(() => toast.remove(), 500);
    }, 2000);
  };

  const onMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    box.style.left = startX + "px";
    box.style.top = startY + "px";
    box.style.width = "0";
    box.style.height = "0";
    box.style.display = "block";
    instructionCard.style.display = "none";
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    const left = Math.min(startX, e.clientX);
    const top = Math.min(startY, e.clientY);
    const width = Math.abs(e.clientX - startX);
    const height = Math.abs(e.clientY - startY);

    box.style.left = left + "px";
    box.style.top = top + "px";
    box.style.width = width + "px";
    box.style.height = height + "px";
  };

  const onMouseUp = (e) => {
    if (!isDragging) return;
    isDragging = false;

    const left = Math.min(startX, e.clientX);
    const top = Math.min(startY, e.clientY);
    const width = Math.abs(e.clientX - startX);
    const height = Math.abs(e.clientY - startY);

    if (width < 20 || height < 20) {
      showToast("Selection too small");
      cleanup();
      return;
    }

    chrome.runtime.sendMessage({
      action: "captureRegion",
      coords: { x: left, y: top, w: width, h: height },
      devicePixelRatio: window.devicePixelRatio || 1,
    });

    cleanup();
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") cleanup();
  };

  overlay.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("keydown", onKeyDown);
})();
