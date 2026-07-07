(function() {
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
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => {
        logDetection("CPU Cores", config.navigator);
        return config.navigator ? 8 : (originalHardware ? originalHardware.call(navigator) : 8);
      }
    });

    const originalMemory = Object.getOwnPropertyDescriptor(Navigator.prototype, 'deviceMemory')?.get;
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => {
        logDetection("Device RAM", config.navigator);
        return config.navigator ? 8 : (originalMemory ? originalMemory.call(navigator) : 8);
      }
    });

    const originalPlatform = Object.getOwnPropertyDescriptor(Navigator.prototype, 'platform')?.get;
    Object.defineProperty(navigator, 'platform', {
      get: () => {
        logDetection("OS Platform", config.navigator);
        return config.navigator ? "Win32" : (originalPlatform ? originalPlatform.call(navigator) : "Linux");
      }
    });
    
    if (navigator.userAgentData) {
      const originalUA = navigator.userAgentData.getHighEntropyValues;
      navigator.userAgentData.getHighEntropyValues = function(hints) {
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
      const originalEstimate = navigator.storage.estimate;
      navigator.storage.estimate = function() {
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
    Object.defineProperty(navigator, 'webdriver', {
      get: () => {
        logDetection("Webdriver Check", config.webdriver);
        return config.webdriver ? false : (originalWebdriver ? originalWebdriver.call(navigator) : true);
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
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = function(constraints) {
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
    Object.defineProperty(screen, 'width', {
      get: () => {
        logDetection("Screen Width", config.screen);
        return config.screen ? 1920 : (originalScreenWidth ? originalScreenWidth.call(screen) : window.innerWidth);
      }
    });

    const originalScreenHeight = Object.getOwnPropertyDescriptor(Screen.prototype, 'height')?.get;
    Object.defineProperty(screen, 'height', {
      get: () => {
        logDetection("Screen Height", config.screen);
        return config.screen ? 1080 : (originalScreenHeight ? originalScreenHeight.call(screen) : window.innerHeight);
      }
    });

    Object.defineProperty(screen, 'availWidth', { get: () => config.screen ? 1920 : window.innerWidth });
    Object.defineProperty(screen, 'availHeight', { get: () => config.screen ? 1040 : window.innerHeight });
    
    Object.defineProperty(window, 'innerWidth', { get: () => config.screen ? 1920 : window.outerWidth });
    Object.defineProperty(window, 'innerHeight', { get: () => config.screen ? 1040 : window.outerHeight });
    Object.defineProperty(window, 'outerWidth', { get: () => config.screen ? 1920 : window.outerWidth });
    Object.defineProperty(window, 'outerHeight', { get: () => config.screen ? 1080 : window.outerHeight });
    Object.defineProperty(window, 'devicePixelRatio', { get: () => config.screen ? 1 : window.devicePixelRatio });
    
    Object.defineProperty(Element.prototype, 'clientWidth', {
      get: function() {
        if (this === document.documentElement || this === document.body) {
          return config.screen ? 1920 : this.getBoundingClientRect().width;
        }
        return this.getBoundingClientRect().width;
      }
    });
    Object.defineProperty(Element.prototype, 'clientHeight', {
      get: function() {
        if (this === document.documentElement || this === document.body) {
          return config.screen ? 1040 : this.getBoundingClientRect().height;
        }
        return this.getBoundingClientRect().height;
      }
    });
  } catch (e) {}

  console.log("[Shield] Standalone anti-surveillance script references updated.");
})();
