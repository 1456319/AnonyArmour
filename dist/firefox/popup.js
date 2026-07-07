document.addEventListener("DOMContentLoaded", () => {
  const fields = ["webgl", "navigator", "canvas", "audio", "webdriver", "biometrics", "screen"];
  
  const blockCountEl = document.getElementById("blockCount");
  const leakCountEl = document.getElementById("leakCount");
  const statusBanner = document.getElementById("statusBanner");
  const logoGlow = document.getElementById("logoGlow");
  
  const resetBtn = document.getElementById("resetBtn");
  const exportReportBtn = document.getElementById("exportReportBtn");

  // Load configuration and statistics
  function updateUI() {
    chrome.storage.local.get({
      webgl: true,
      navigator: true,
      canvas: true,
      audio: true,
      webdriver: true,
      biometrics: true,
      screen: true,
      blockCount: 0,
      leakCount: 0
    }, (items) => {
      // Set switches
      fields.forEach(field => {
        const checkbox = document.getElementById(field);
        if (checkbox) {
          checkbox.checked = items[field];
        }
      });

      // Update counters
      const blocks = items.blockCount || 0;
      const leaks = items.leakCount || 0;
      
      blockCountEl.textContent = blocks;
      leakCountEl.textContent = leaks;

      // Update status banner and logo glow
      statusBanner.className = "status-banner";
      if (leaks > 0) {
        statusBanner.textContent = "ATTACKED - DATA EXFILTRATED";
        statusBanner.classList.add("status-exfiltrated");
        logoGlow.style.backgroundColor = "var(--accent-red)";
        logoGlow.style.boxShadow = "0 0 10px var(--accent-red)";
      } else if (blocks > 0) {
        statusBanner.textContent = "ATTACKED - SECURED";
        statusBanner.classList.add("status-defended");
        logoGlow.style.backgroundColor = "var(--accent-orange)";
        logoGlow.style.boxShadow = "0 0 10px var(--accent-orange)";
      } else {
        statusBanner.textContent = "SYSTEM SECURE";
        statusBanner.classList.add("status-secure");
        logoGlow.style.backgroundColor = "var(--accent-green)";
        logoGlow.style.boxShadow = "0 0 10px var(--accent-green)";
      }
    });
  }

  updateUI();

  // Listen for config changes
  fields.forEach(field => {
    const checkbox = document.getElementById(field);
    if (checkbox) {
      checkbox.addEventListener("change", (e) => {
        const update = {};
        update[field] = e.target.checked;
        chrome.storage.local.set(update, () => {
          updateUI();
        });
      });
    }
  });

  // Reset stats and logs
  resetBtn.addEventListener("click", () => {
    chrome.storage.local.set({ blockCount: 0, leakCount: 0, logs: [] }, () => {
      updateUI();
    });
  });

  // Export local report
  exportReportBtn.addEventListener("click", () => {
    chrome.storage.local.get({
      blockCount: 0,
      leakCount: 0,
      logs: []
    }, (result) => {
      const now = new Date().toLocaleString();
      let statusStr = "SECURE";
      if (result.leakCount > 0) {
        statusStr = "COMPROMISED (DATA EXFILTRATED)";
      } else if (result.blockCount > 0) {
        statusStr = "DEFENDED (ATTACKS SUCCESSFULLY SPOOFED)";
      }

      let reportText = `====================================================
ANONYARMOUR LOCAL SURVEILLANCE AUDIT REPORT
====================================================
Generated At : ${now}
System Status: ${statusStr}
----------------------------------------------------
Defended Telemetry Blocks: ${result.blockCount}
Exfiltrated Telemetry Leaks: ${result.leakCount}
====================================================

--- EVENT AUDIT LOGS ---
`;

      if (result.logs && result.logs.length > 0) {
        // Reverse logs to show newest first
        const sortedLogs = [...result.logs].reverse();
        sortedLogs.forEach((log, index) => {
          reportText += `\n[Event #${sortedLogs.length - index}] ${log.timestamp}
Origin URL: ${log.url}
Probe Type: ${log.metric}
Shield Status: ${log.status}
----------------------------------------------------`;
        });
      } else {
        reportText += "\nNo probe events logged yet.";
      }

      // Trigger file download
      const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AnonyArmour_Audit_Report_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  });
});
