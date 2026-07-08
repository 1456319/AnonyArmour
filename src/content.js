// content.js - Injects the main-world spoofing script as early as possible without web_accessible_resources
try {
  chrome.storage.local.get({
    webgl: true,
    navigator: true,
    canvas: true,
    audio: true,
    webdriver: true,
    biometrics: true,
    screen: true
  }, (settings) => {
    // Inject configurations via a custom DOM attribute to be 100% CSP compliant
    document.documentElement.setAttribute('data-shield-config', JSON.stringify(settings));

    const injectCode = `(function() {
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

      const logDetection = (metricName, isSecured) => {
        console.warn("[Shield] Intercepted probe: " + metricName + " | Secured: " + isSecured);
        window.postMessage({ 
          type: "TELEMETRY_DETECTED", 
          details: { metric: metricName, secured: isSecured } 
        }, "*");
      };

      // =========================================================================
      // Module 1: WebGL & GPU Spoofing
      // =========================================================================
      const spoofWebGLParams = (proto) => {
        if (!proto) return;
        const originalGetParameter = proto.getParameter;
        proto.getParameter = function(parameter) {
          if (parameter === 37445 || parameter === 7936) {
            logDetection("WebGL Vendor", config.webgl);
            return config.webgl ? "Google Inc. (NVIDIA)" : originalGetParameter.apply(this, arguments);
          }
          if (parameter === 37446 || parameter === 7937) {
            logDetection("WebGL Renderer", config.webgl);
            return config.webgl ? "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)" : originalGetParameter.apply(this, arguments);
          }
          return originalGetParameter.apply(this, arguments);
        };
      };
      spoofWebGLParams(window.WebGLRenderingContext?.prototype);
      spoofWebGLParams(window.WebGL2RenderingContext?.prototype);

      // =========================================================================
      // Module 2: Navigator & Hardware Spoofing
      // =========================================================================
      try {
        const originalHardware = Object.getOwnPropertyDescriptor(Navigator.prototype, 'hardwareConcurrency')?.get;
        Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
          get: function() {
            logDetection("CPU Cores", config.navigator);
            return config.navigator ? 8 : (originalHardware ? originalHardware.call(this) : 8);
          }
        });

        const originalMemory = Object.getOwnPropertyDescriptor(Navigator.prototype, 'deviceMemory')?.get;
        Object.defineProperty(Navigator.prototype, 'deviceMemory', {
          get: function() {
            logDetection("Device RAM", config.navigator);
            return config.navigator ? 8 : (originalMemory ? originalMemory.call(this) : 8);
          }
        });

        const originalPlatform = Object.getOwnPropertyDescriptor(Navigator.prototype, 'platform')?.get;
        Object.defineProperty(Navigator.prototype, 'platform', {
          get: function() {
            logDetection("OS Platform", config.navigator);
            return config.navigator ? "Win32" : (originalPlatform ? originalPlatform.call(this) : "Linux");
          }
        });
        
        if (navigator.userAgentData) {
          const uaDataProto = Object.getPrototypeOf(navigator.userAgentData);
          const originalUA = uaDataProto.getHighEntropyValues;
          uaDataProto.getHighEntropyValues = function(hints) {
            logDetection("UA Client Hints", config.navigator);
            if (config.navigator) {
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
            }
            return originalUA.apply(this, arguments);
          };
        }

        if (navigator.storage && navigator.storage.estimate) {
          const storageProto = Object.getPrototypeOf(navigator.storage);
          const originalEstimate = storageProto.estimate;
          storageProto.estimate = function() {
            logDetection("Storage Quota Check", config.navigator);
            if (config.navigator) {
              return Promise.resolve({
                quota: 120 * 1024 * 1024 * 1024,
                usage: 1024 * 1024
              });
            }
            return originalEstimate.apply(this, arguments);
          };
        }
      } catch (e) {}

      // =========================================================================
      // Module 3: Canvas Fingerprinting
      // =========================================================================
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function() {
        logDetection("Canvas toDataURL", config.canvas);
        if (config.canvas) {
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
        }
        return originalToDataURL.apply(this, arguments);
      };

      const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function() {
        logDetection("Canvas getImageData", config.canvas);
        const imgData = originalGetImageData.apply(this, arguments);
        if (config.canvas && imgData.data.length > 0) {
          imgData.data[0] = (imgData.data[0] + 1) % 256;
        }
        return imgData;
      };

      // =========================================================================
      // Module 4: AudioContext
      // =========================================================================
      try {
        const originalGetChannelData = AudioBuffer.prototype.getChannelData;
        AudioBuffer.prototype.getChannelData = function() {
          logDetection("Audio Channel Data", config.audio);
          const data = originalGetChannelData.apply(this, arguments);
          if (config.audio) {
            for (let i = 0; i < Math.min(data.length, 10); i++) {
              data[i] += (Math.random() - 0.5) * 1e-6;
            }
          }
          return data;
        };
      } catch (e) {}

      // =========================================================================
      // Module 5: WebDriver
      // =========================================================================
      try {
        const originalWebdriver = Object.getOwnPropertyDescriptor(Navigator.prototype, 'webdriver')?.get;
        Object.defineProperty(Navigator.prototype, 'webdriver', {
          get: function() {
            logDetection("Webdriver Check", config.webdriver);
            return config.webdriver ? false : (originalWebdriver ? originalWebdriver.call(this) : true);
          }
        });
        if (config.webdriver) {
          const cleanProperties = [
            "cdc_adoQytsou5wdcx5cjocfdcca_Array",
            "cdc_adoQytsou5wdcx5cjocfdcca_Promise",
            "cdc_adoQytsou5wdcx5cjocfdcca_Symbol"
          ];
          cleanProperties.forEach(prop => {
            if (window[prop]) delete window[prop];
          });
        }
      } catch (e) {}

      // =========================================================================
      // Module 6: Camera & Biometrics
      // =========================================================================
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const mediaDevicesProto = Object.getPrototypeOf(navigator.mediaDevices);
          const originalGetUserMedia = mediaDevicesProto.getUserMedia;
          mediaDevicesProto.getUserMedia = function(constraints) {
            logDetection("Biometric Request", config.biometrics);
            if (config.biometrics && constraints && constraints.video) {
              console.warn("[Shield] Blocking biometric camera stream request.");
              return Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
            }
            return originalGetUserMedia.apply(this, arguments);
          };
        }
      } catch (e) {}

      // =========================================================================
      // Module 7: Screen & Viewport
      // =========================================================================
      try {
        const originalScreenWidth = Object.getOwnPropertyDescriptor(Screen.prototype, 'width')?.get;
        Object.defineProperty(Screen.prototype, 'width', {
          get: function() {
            logDetection("Screen Width", config.screen);
            return config.screen ? 1920 : (originalScreenWidth ? originalScreenWidth.call(this) : window.innerWidth);
          }
        });

        const originalScreenHeight = Object.getOwnPropertyDescriptor(Screen.prototype, 'height')?.get;
        Object.defineProperty(Screen.prototype, 'height', {
          get: function() {
            logDetection("Screen Height", config.screen);
            return config.screen ? 1080 : (originalScreenHeight ? originalScreenHeight.call(this) : window.innerHeight);
          }
        });

        const originalAvailWidth = Object.getOwnPropertyDescriptor(Screen.prototype, 'availWidth')?.get;
        Object.defineProperty(Screen.prototype, 'availWidth', { get: function() { return config.screen ? 1920 : (originalAvailWidth ? originalAvailWidth.call(this) : window.innerWidth); } });
        
        const originalAvailHeight = Object.getOwnPropertyDescriptor(Screen.prototype, 'availHeight')?.get;
        Object.defineProperty(Screen.prototype, 'availHeight', { get: function() { return config.screen ? 1040 : (originalAvailHeight ? originalAvailHeight.call(this) : window.innerHeight); } });
        
        const originalInnerWidth = Object.getOwnPropertyDescriptor(Window.prototype, 'innerWidth')?.get;
        Object.defineProperty(Window.prototype, 'innerWidth', { get: function() { return config.screen ? 1920 : (originalInnerWidth ? originalInnerWidth.call(this) : window.outerWidth); } });

        const originalInnerHeight = Object.getOwnPropertyDescriptor(Window.prototype, 'innerHeight')?.get;
        Object.defineProperty(Window.prototype, 'innerHeight', { get: function() { return config.screen ? 1040 : (originalInnerHeight ? originalInnerHeight.call(this) : window.outerHeight); } });

        const originalOuterWidth = Object.getOwnPropertyDescriptor(Window.prototype, 'outerWidth')?.get;
        Object.defineProperty(Window.prototype, 'outerWidth', { get: function() { return config.screen ? 1920 : (originalOuterWidth ? originalOuterWidth.call(this) : 1920); } });

        const originalOuterHeight = Object.getOwnPropertyDescriptor(Window.prototype, 'outerHeight')?.get;
        Object.defineProperty(Window.prototype, 'outerHeight', { get: function() { return config.screen ? 1080 : (originalOuterHeight ? originalOuterHeight.call(this) : 1080); } });

        const originalPixelRatio = Object.getOwnPropertyDescriptor(Window.prototype, 'devicePixelRatio')?.get;
        Object.defineProperty(Window.prototype, 'devicePixelRatio', { get: function() { return config.screen ? 1 : (originalPixelRatio ? originalPixelRatio.call(this) : 1); } });

        const originalClientWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')?.get;
        Object.defineProperty(Element.prototype, 'clientWidth', {
          get: function() {
            if (config.screen && (this === document.documentElement || this === document.body)) {
              return 1920;
            }
            return originalClientWidth ? originalClientWidth.call(this) : this.getBoundingClientRect().width;
          }
        });

        const originalClientHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')?.get;
        Object.defineProperty(Element.prototype, 'clientHeight', {
          get: function() {
            if (config.screen && (this === document.documentElement || this === document.body)) {
              return 1040;
            }
            return originalClientHeight ? originalClientHeight.call(this) : this.getBoundingClientRect().height;
          }
        });
      } catch (e) {}

      console.log("[Shield] Modular anti-surveillance hooks fully loaded.");
    })();`;

    // Inject inlined main-world script
    const script = document.createElement('script');
    script.textContent = injectCode;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
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
