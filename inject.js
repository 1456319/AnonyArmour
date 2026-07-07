(function() {
  // Read config from DOM attribute
  const configAttr = document.documentElement.getAttribute('data-shield-config');
  const config = configAttr ? JSON.parse(configAttr) : {
    webgl: true,
    navigator: true,
    canvas: true,
    audio: true,
    webdriver: true,
    biometrics: true,
    screen: true
  };
  document.documentElement.removeAttribute('data-shield-config');

  const logDetection = (metricName) => {
    console.warn("[Shield] Intercepted probe for: " + metricName);
    window.postMessage({ type: "TELEMETRY_DETECTED", details: metricName }, "*");
  };

  // =========================================================================
  // Module 1: WebGL & GPU Spoofing
  // =========================================================================
  if (config.webgl) {
    const spoofWebGLParams = (proto) => {
      if (!proto) return;
      const originalGetParameter = proto.getParameter;
      proto.getParameter = function(parameter) {
        // UNMASKED_VENDOR_WEBGL (37445)
        if (parameter === 37445) {
          logDetection("WebGL Vendor");
          return "Google Inc. (NVIDIA)";
        }
        // UNMASKED_RENDERER_WEBGL (37446)
        if (parameter === 37446) {
          logDetection("WebGL Renderer");
          return "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)";
        }
        if (parameter === 7936) return "Google Inc. (NVIDIA)"; // VENDOR
        if (parameter === 7937) return "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)"; // RENDERER
        return originalGetParameter.apply(this, arguments);
      };
    };

    spoofWebGLParams(window.WebGLRenderingContext?.prototype);
    spoofWebGLParams(window.WebGL2RenderingContext?.prototype);
  }

  // =========================================================================
  // Module 2: Navigator & Hardware Spoofing
  // =========================================================================
  if (config.navigator) {
    try {
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => { logDetection("CPU Cores"); return 8; } });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => { logDetection("Device RAM"); return 8; } });
      Object.defineProperty(navigator, 'platform', { get: () => { logDetection("OS Platform"); return "Win32"; } });
      
      if (navigator.userAgentData) {
        navigator.userAgentData.getHighEntropyValues = function(hints) {
          logDetection("UA Client Hints");
          return Promise.resolve({
            architecture: "x86",
            bitness: "64",
            brands: [
              { brand: "Not/A)Brand", version: "8" },
              { brand: "Chromium", version: "146" },
              { brand: "Google Chrome", version: "146" }
            ],
            mobile: false,
            model: "",
            platform: "Windows",
            platformVersion: "15.0.0"
          });
        };
      }

      // Incognito bypass: spoof StorageManager estimate
      if (navigator.storage && navigator.storage.estimate) {
        const originalEstimate = navigator.storage.estimate;
        navigator.storage.estimate = function() {
          logDetection("Storage Quota Check (Incognito)");
          return Promise.resolve({
            quota: 120 * 1024 * 1024 * 1024, // 120 GB
            usage: 1024 * 1024 // 1 MB
          });
        };
      }
    } catch (e) {
      console.warn("[Shield] Failed to spoof navigator properties:", e);
    }
  }

  // =========================================================================
  // Module 3: Canvas Fingerprinting Defeating (Farbling)
  // =========================================================================
  if (config.canvas) {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function() {
      logDetection("Canvas toDataURL");
      const ctx = this.getContext('2d');
      if (ctx) {
        try {
          const imgData = ctx.getImageData(0, 0, this.width || 1, this.height || 1);
          if (imgData.data.length > 0) {
            imgData.data[0] = (imgData.data[0] + 1) % 256; 
            ctx.putImageData(imgData, 0, 0);
          }
        } catch (e) {}
      }
      return originalToDataURL.apply(this, arguments);
    };

    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function() {
      logDetection("Canvas getImageData");
      const imgData = originalGetImageData.apply(this, arguments);
      if (imgData.data.length > 0) {
        imgData.data[0] = (imgData.data[0] + 1) % 256;
      }
      return imgData;
    };
  }

  // =========================================================================
  // Module 4: AudioContext Fingerprint Defeating
  // =========================================================================
  if (config.audio) {
    try {
      const originalGetChannelData = AudioBuffer.prototype.getChannelData;
      AudioBuffer.prototype.getChannelData = function() {
        logDetection("Audio Channel Data");
        const data = originalGetChannelData.apply(this, arguments);
        for (let i = 0; i < Math.min(data.length, 10); i++) {
          data[i] += (Math.random() - 0.5) * 1e-6;
        }
        return data;
      };
    } catch (e) {}
  }

  // =========================================================================
  // Module 5: Automation / WebDriver Evasion
  // =========================================================================
  if (config.webdriver) {
    try {
      Object.defineProperty(navigator, 'webdriver', { get: () => { logDetection("Webdriver Check"); return false; } });
      const cleanProperties = [
        "cdc_adoQytsou5wdcx5cjocfdcca_Array",
        "cdc_adoQytsou5wdcx5cjocfdcca_Promise",
        "cdc_adoQytsou5wdcx5cjocfdcca_Symbol"
      ];
      cleanProperties.forEach(prop => {
        if (window[prop]) delete window[prop];
      });
    } catch (e) {}
  }

  // =========================================================================
  // Module 6: Camera & Biometric Isolation
  // =========================================================================
  if (config.biometrics) {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
        navigator.mediaDevices.getUserMedia = function(constraints) {
          logDetection("Biometric Request");
          if (constraints && constraints.video) {
            console.warn("[Shield] Warning: Intercepted biometric camera stream request.");
          }
          return originalGetUserMedia.apply(this, arguments);
        };
      }
    } catch (e) {}
  }

  // =========================================================================
  // Module 7: Screen & Viewport Spoofing (1920x1080 resolution)
  // =========================================================================
  if (config.screen) {
    try {
      Object.defineProperty(screen, 'width', { get: () => { logDetection("Screen Width"); return 1920; } });
      Object.defineProperty(screen, 'height', { get: () => { logDetection("Screen Height"); return 1080; } });
      Object.defineProperty(screen, 'availWidth', { get: () => 1920 });
      Object.defineProperty(screen, 'availHeight', { get: () => 1040 });
      Object.defineProperty(window, 'innerWidth', { get: () => { logDetection("Window Inner Width"); return 1920; } });
      Object.defineProperty(window, 'innerHeight', { get: () => { logDetection("Window Inner Height"); return 1040; } });
      Object.defineProperty(window, 'outerWidth', { get: () => 1920 });
      Object.defineProperty(window, 'outerHeight', { get: () => 1080 });
      Object.defineProperty(window, 'devicePixelRatio', { get: () => { logDetection("Device Pixel Ratio"); return 1; } });
      
      // Also spoof clientWidth and clientHeight on documentElement to ensure consistency
      Object.defineProperty(Element.prototype, 'clientWidth', {
        get: function() {
          if (this === document.documentElement || this === document.body) {
            return 1920;
          }
          return this.getBoundingClientRect().width;
        }
      });
      Object.defineProperty(Element.prototype, 'clientHeight', {
        get: function() {
          if (this === document.documentElement || this === document.body) {
            return 1040;
          }
          return this.getBoundingClientRect().height;
        }
      });
    } catch (e) {}
  }

  console.log("[Shield] Standalone anti-surveillance script references updated.");
})();
