document.addEventListener("DOMContentLoaded", () => {
  const fields = ["webgl", "navigator", "canvas", "audio", "webdriver", "biometrics", "screen"];
  const blockCountEl = document.getElementById("blockCount");
  const resetBtn = document.getElementById("resetBtn");

  // Load saved preferences and counters
  chrome.storage.local.get({
    webgl: true,
    navigator: true,
    canvas: true,
    audio: true,
    webdriver: true,
    biometrics: true,
    screen: true,
    blockCount: 0
  }, (items) => {
    fields.forEach(field => {
      const checkbox = document.getElementById(field);
      if (checkbox) {
        checkbox.checked = items[field];
      }
    });
    blockCountEl.textContent = items.blockCount;
  });

  // Listen for changes in configurations and update storage
  fields.forEach(field => {
    const checkbox = document.getElementById(field);
    if (checkbox) {
      checkbox.addEventListener("change", (e) => {
        const update = {};
        update[field] = e.target.checked;
        chrome.storage.local.set(update);
      });
    }
  });

  // Reset telemetry counter
  resetBtn.addEventListener("click", () => {
    chrome.storage.local.set({ blockCount: 0 }, () => {
      blockCountEl.textContent = 0;
    });
  });
});
