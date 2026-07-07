const defaultFilters = [
  "fpjs.io",
  "fpcdn.io",
  "withpersona.com",
  "dreamdata.cloud",
  "microblink.com"
];

chrome.runtime.onInstalled.addListener(() => {
  setupRules();
  // Initialize storage logs
  chrome.storage.local.set({ logs: [], blockCount: 0, leakCount: 0 });
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
  console.log("AnonyArmour network firewall rules initialized.");
}

// Log telemetry interception events
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getSettings") {
    chrome.storage.local.get({
      webgl: true,
      navigator: true,
      canvas: true,
      audio: true,
      webdriver: true,
      biometrics: true,
      screen: true
    }, (items) => {
      sendResponse(items);
    });
    return true; 
  }
  
  if (message.action === "logDetection") {
    const timestamp = new Date().toISOString();
    const isSecured = message.details.secured !== false; // Check if the module was enabled
    
    chrome.storage.local.get({ logs: [], blockCount: 0, leakCount: 0 }, (result) => {
      let logs = result.logs || [];
      let blockCount = result.blockCount;
      let leakCount = result.leakCount;
      
      const newLog = {
        timestamp,
        metric: message.details.metric || message.details,
        url: sender.tab ? sender.tab.url : "Background Context",
        status: isSecured ? "DEFENDED" : "EXFILTRATED"
      };
      
      logs.push(newLog);
      // Keep last 100 entries to prevent storage bloat
      if (logs.length > 100) logs.shift();
      
      if (isSecured) {
        blockCount++;
      } else {
        leakCount++;
      }
      
      chrome.storage.local.set({ logs, blockCount, leakCount });
    });
  }
});
