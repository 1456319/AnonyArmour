// content.js - Injects the main-world spoofing script as early as possible without web_accessible_resources
try {
  chrome.storage.local.get({
    webgl: true,
    navigator: true,
    canvas: true,
    audio: true,
    webdriver: true,
    biometrics: true,
    screen: true,
    webrtc: true
  }, (settings) => {
    // Inject configurations via a custom DOM attribute to be 100% CSP compliant
    document.documentElement.setAttribute('data-shield-config', JSON.stringify(settings));

    // Inject main-world script via src to support strict CSPs on Firefox and Edge
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    (document.head || document.documentElement).appendChild(script);
    script.onload = () => script.remove();
  });
} catch (e) {
  console.error("Shield script injection failed:", e);
}

// Listen to messages from main world
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data && event.data.type === "TELEMETRY_DETECTED") {
    chrome.runtime.sendMessage({ action: "logDetection", details: event.data.details });
  }
});
