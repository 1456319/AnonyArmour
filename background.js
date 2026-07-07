const defaultFilters = [
  "fpjs.io",
  "fpcdn.io",
  "withpersona.com",
  "dreamdata.cloud",
  "microblink.com"
];

chrome.runtime.onInstalled.addListener(() => {
  setupRules();
});

async function setupRules() {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules.map(r => r.id);
  
  const rules = defaultFilters.map((domain, index) => {
    return {
      id: index + 1,
      priority: 1,
      action: { type: "block" },
      condition: {
        urlFilter: `*://${domain}/*`,
        resourceTypes: ["script", "xmlhttprequest", "sub_frame", "image", "other"]
      }
    };
  });
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: rules
  });
  console.log("Anti-Surveillance network rules initialized successfully.");
}

// Simple message listener for content script requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getSettings") {
    chrome.storage.local.get({
      webgl: true,
      navigator: true,
      canvas: true,
      audio: true,
      webdriver: true,
      biometrics: true
    }, (items) => {
      sendResponse(items);
    });
    return true; // Keep message channel open for async response
  }
  if (message.action === "logDetection") {
    // Increment telemetry block / detection counter
    chrome.storage.local.get({ blockCount: 0 }, (result) => {
      chrome.storage.local.set({ blockCount: result.blockCount + 1 });
    });
  }
});
