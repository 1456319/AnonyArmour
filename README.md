# AnonyArmour

AnonyArmour is a modular, high-anonymity browser extension (Manifest V3) designed to block invasive third-party telemetry and actively spoof device fingerprinting attributes. It is optimized to neutralize enterprise-grade tracking platforms, document scanning OCR, and biometric selfie scanners.

---

## Key Features

1. **GPU & WebGL Shield**: Masks rendering contexts and hardware vendor details, reporting a standard desktop graphics card (NVIDIA GeForce RTX 3060).
2. **Navigator & Hardware Mask**: Overwrites device cores (`8`), memory size (`8 GB`), and system platform details, while intercepting User-Agent Client Hints to prevent leaks.
3. **Screen & Viewport Normalizer**: Forces the reporting of generic screen dimensions (`1920x1080`) and window coordinates, while preserving normal page layout.
4. **Canvas Farbling**: Automatically injects subtle, imperceptible mathematical noise into canvas data URL and pixel extraction attempts.
5. **Audio Context Guard**: Intercepts channel data requests and injects tiny variance to prevent exact acoustic waveform graphing.
6. **WebDriver Cleaner**: Erases browser automation properties typically exposed by headless/automated environments.
7. **Biometrics Isolation**: Warns and blocks access requests to physical cameras/microphones by verification frameworks.
8. **Network Domain Blocker**: Automatically drops connections to tracking CDNs (`fpjs.io`, `fpcdn.io`, `withpersona.com`, `dreamdata.cloud`, `microblink.com`).

---

## Color-Coded Security Indicators

The extension popup features a live status banner detailing your security state:

*   🟢 **SYSTEM SECURE (Green)**: The environment is clean; no tracking attempts or hardware profiling have occurred.
*   🟠 **ATTACKED - SECURED (Orange)**: Telemetry servers attempted to query your hardware configuration, but the extension successfully intercepted and returned fake/spoofed attributes.
*   🔴 **ATTACKED - DATA EXFILTRATED (Red)**: The website successfully queried device hardware or biometric information while one or more shield modules were disabled, meaning raw hardware/system attributes were exposed.

---

## Local Auditing & Reporting

AnonyArmour tracks every probe and blocking event locally in your browser storage.
*   Click **Export Local Audit Report** in the extension popup to generate and download a detailed markdown/text analysis (`AnonyArmour_Audit_Report_[Date].txt`) containing timestamps, origin URLs, exact probe targets, and shield status.
*   Click **Reset Counter & Logs** to purge logs from local memory.

---

## Installation

1.  Open Brave or Chrome and navigate to `brave://extensions/` (or `chrome://extensions/`).
2.  Enable **Developer mode** (toggle in the top-right corner).
3.  Click **Load unpacked** (top-left corner).
4.  Select the **`fingerprint-shield`** directory.
