(function() {
  const configAttr = document.documentElement.getAttribute('data-shield-config');
  const config = configAttr ? JSON.parse(configAttr) : {
    webgl: true,
    navigator: true,
    canvas: true,
    audio: true,
    webdriver: true,
    biometrics: true,
    screen: true,
    webrtc: true
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
  // Spoofing Helpers & toString Protection
  // =========================================================================
  const mockedFunctions = new WeakMap();
  const originalToString = Function.prototype.toString;
  const toStringProxy = new Proxy(originalToString, {
    apply(target, thisArg, args) {
      if (mockedFunctions.has(thisArg)) {
        const name = mockedFunctions.get(thisArg);
        const nameStr = name ? name : '';
        return 'function ' + nameStr + '() { [native code] }';
      }
      return Reflect.apply(target, thisArg, args);
    }
  });
  Function.prototype.toString = toStringProxy;
  mockedFunctions.set(toStringProxy, 'toString');

  function spoofGetter(obj, prop, fakeFunc, name) {
    if (!obj) return;
    const origDesc = Object.getOwnPropertyDescriptor(obj, prop);
    if (!origDesc || !origDesc.get) return;
    mockedFunctions.set(fakeFunc, name || ('get ' + prop));
    Object.defineProperty(obj, prop, {
      get: fakeFunc,
      set: origDesc.set,
      enumerable: origDesc.enumerable,
      configurable: origDesc.configurable
    });
  }

  function spoofMethod(obj, prop, fakeFunc, name) {
    if (!obj) return;
    const origFunc = obj[prop];
    if (!origFunc) return;
    mockedFunctions.set(fakeFunc, name || prop);
    obj[prop] = fakeFunc;
  }

  // =========================================================================
  // Module 1: WebGL & GPU Spoofing
  // =========================================================================
  const spoofWebGLParams = (proto) => {
    if (!proto) return;
    const originalGetParameter = proto.getParameter;
    if (!originalGetParameter) return;
    const getParameter = function(parameter) {
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
    spoofMethod(proto, 'getParameter', getParameter);
  };
  spoofWebGLParams(window.WebGLRenderingContext?.prototype);
  spoofWebGLParams(window.WebGL2RenderingContext?.prototype);

  // =========================================================================
  // Module 2: Navigator & Hardware Spoofing
  // =========================================================================
  try {
    if (window.Navigator && window.Navigator.prototype) {
      const originalHardware = Object.getOwnPropertyDescriptor(Navigator.prototype, 'hardwareConcurrency')?.get;
      const getHardwareConcurrency = function() {
        logDetection("CPU Cores", config.navigator);
        return config.navigator ? 8 : (originalHardware ? originalHardware.call(this) : 8);
      };
      spoofGetter(Navigator.prototype, 'hardwareConcurrency', getHardwareConcurrency);

      const originalMemory = Object.getOwnPropertyDescriptor(Navigator.prototype, 'deviceMemory')?.get;
      const getDeviceMemory = function() {
        logDetection("Device RAM", config.navigator);
        return config.navigator ? 8 : (originalMemory ? originalMemory.call(this) : 8);
      };
      spoofGetter(Navigator.prototype, 'deviceMemory', getDeviceMemory);

      const originalPlatform = Object.getOwnPropertyDescriptor(Navigator.prototype, 'platform')?.get;
      const getPlatform = function() {
        logDetection("OS Platform", config.navigator);
        return config.navigator ? "Win32" : (originalPlatform ? originalPlatform.call(this) : "Linux");
      };
      spoofGetter(Navigator.prototype, 'platform', getPlatform);
    }
    
    if (navigator.userAgentData) {
      const uaDataProto = Object.getPrototypeOf(navigator.userAgentData);
      const originalUA = uaDataProto.getHighEntropyValues;
      if (originalUA) {
        const getHighEntropyValues = function(hints) {
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
        spoofMethod(uaDataProto, 'getHighEntropyValues', getHighEntropyValues);
      }
    }

    if (navigator.storage && navigator.storage.estimate) {
      const storageProto = Object.getPrototypeOf(navigator.storage);
      const originalEstimate = storageProto.estimate;
      if (originalEstimate) {
        const estimate = function() {
          logDetection("Storage Quota Check", config.navigator);
          if (config.navigator) {
            return Promise.resolve({
              quota: 120 * 1024 * 1024 * 1024,
              usage: 1024 * 1024
            });
          }
          return originalEstimate.apply(this, arguments);
        };
        spoofMethod(storageProto, 'estimate', estimate);
      }
    }
  } catch (e) {}

  // =========================================================================
  // Module 3: Canvas Fingerprinting
  // =========================================================================
  if (window.HTMLCanvasElement && window.HTMLCanvasElement.prototype) {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    if (originalToDataURL) {
      const toDataURL = function() {
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
      spoofMethod(HTMLCanvasElement.prototype, 'toDataURL', toDataURL);
    }
  }

  if (window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype) {
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    if (originalGetImageData) {
      const getImageData = function() {
        logDetection("Canvas getImageData", config.canvas);
        const imgData = originalGetImageData.apply(this, arguments);
        if (config.canvas && imgData && imgData.data && imgData.data.length > 0) {
          imgData.data[0] = (imgData.data[0] + 1) % 256;
        }
        return imgData;
      };
      spoofMethod(CanvasRenderingContext2D.prototype, 'getImageData', getImageData);
    }
  }

  // =========================================================================
  // Module 4: AudioContext
  // =========================================================================
  try {
    if (window.AudioBuffer && window.AudioBuffer.prototype) {
      const originalGetChannelData = AudioBuffer.prototype.getChannelData;
      if (originalGetChannelData) {
        const getChannelData = function() {
          logDetection("Audio Channel Data", config.audio);
          const data = originalGetChannelData.apply(this, arguments);
          if (config.audio && data) {
            for (let i = 0; i < Math.min(data.length, 10); i++) {
              data[i] += (Math.random() - 0.5) * 1e-6;
            }
          }
          return data;
        };
        spoofMethod(AudioBuffer.prototype, 'getChannelData', getChannelData);
      }
    }
  } catch (e) {}

  // =========================================================================
  // Module 5: WebDriver
  // =========================================================================
  try {
    if (window.Navigator && window.Navigator.prototype) {
      const originalWebdriver = Object.getOwnPropertyDescriptor(Navigator.prototype, 'webdriver')?.get;
      const getWebdriver = function() {
        logDetection("Webdriver Check", config.webdriver);
        return config.webdriver ? false : (originalWebdriver ? originalWebdriver.call(this) : true);
      };
      spoofGetter(Navigator.prototype, 'webdriver', getWebdriver);
    }
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
      const mdProto = Object.getPrototypeOf(navigator.mediaDevices);
      const originalGetUserMedia = mdProto.getUserMedia;
      if (originalGetUserMedia) {
        const getUserMedia = function(constraints) {
          logDetection("Biometric Request", config.biometrics);
          if (config.biometrics && constraints && constraints.video) {
            console.warn("[Shield] Blocking biometric camera stream request.");
            return Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
          }
          return originalGetUserMedia.apply(this, arguments);
        };
        spoofMethod(mdProto, 'getUserMedia', getUserMedia);
      }
    }
  } catch (e) {}

  // =========================================================================
  // Module 7: Screen & Viewport
  // =========================================================================
  try {
    if (window.Screen && window.Screen.prototype) {
      const originalScreenWidth = Object.getOwnPropertyDescriptor(Screen.prototype, 'width')?.get;
      const getWidth = function() {
        logDetection("Screen Width", config.screen);
        return config.screen ? 1920 : (originalScreenWidth ? originalScreenWidth.call(this) : window.innerWidth);
      };
      spoofGetter(Screen.prototype, 'width', getWidth);

      const originalScreenHeight = Object.getOwnPropertyDescriptor(Screen.prototype, 'height')?.get;
      const getHeight = function() {
        logDetection("Screen Height", config.screen);
        return config.screen ? 1080 : (originalScreenHeight ? originalScreenHeight.call(this) : window.innerHeight);
      };
      spoofGetter(Screen.prototype, 'height', getHeight);

      const originalAvailWidth = Object.getOwnPropertyDescriptor(Screen.prototype, 'availWidth')?.get;
      const getAvailWidth = function() {
        return config.screen ? 1920 : (originalAvailWidth ? originalAvailWidth.call(this) : window.innerWidth);
      };
      spoofGetter(Screen.prototype, 'availWidth', getAvailWidth);
      
      const originalAvailHeight = Object.getOwnPropertyDescriptor(Screen.prototype, 'availHeight')?.get;
      const getAvailHeight = function() {
        return config.screen ? 1040 : (originalAvailHeight ? originalAvailHeight.call(this) : window.innerHeight);
      };
      spoofGetter(Screen.prototype, 'availHeight', getAvailHeight);
    }
    
    // Window properties
    const spoofWindowProp = (prop, fakeVal) => {
      const proto = Window.prototype.hasOwnProperty(prop) ? Window.prototype : window;
      const origDesc = Object.getOwnPropertyDescriptor(proto, prop);
      if (origDesc && origDesc.get) {
         const getProp = function() { return config.screen ? fakeVal : origDesc.get.call(this); };
         spoofGetter(proto, prop, getProp);
      } else {
         const getProp = function() { return config.screen ? fakeVal : window[prop]; };
         mockedFunctions.set(getProp, 'get ' + prop);
         Object.defineProperty(proto, prop, { get: getProp, set: undefined, configurable: true, enumerable: true });
      }
    };

    spoofWindowProp('innerWidth', 1920);
    spoofWindowProp('innerHeight', 1040);
    spoofWindowProp('outerWidth', 1920);
    spoofWindowProp('outerHeight', 1080);
    spoofWindowProp('devicePixelRatio', 1);

    if (window.Element && window.Element.prototype) {
      const origClientWidthDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth');
      if (origClientWidthDesc && origClientWidthDesc.get) {
        const getClientWidth = function() {
          if (config.screen && (this === document.documentElement || this === document.body)) {
            return 1920;
          }
          return origClientWidthDesc.get.call(this);
        };
        spoofGetter(Element.prototype, 'clientWidth', getClientWidth);
      }
      const origClientHeightDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight');
      if (origClientHeightDesc && origClientHeightDesc.get) {
        const getClientHeight = function() {
          if (config.screen && (this === document.documentElement || this === document.body)) {
            return 1040;
          }
          return origClientHeightDesc.get.call(this);
        };
        spoofGetter(Element.prototype, 'clientHeight', getClientHeight);
      }
    }
  } catch (e) {}

  // =========================================================================
  // Module 8: WebRTC & IP Leak Protection
  // =========================================================================
  try {
    if (window.RTCPeerConnection) {
      const originalRTCPeerConnection = window.RTCPeerConnection;
      
      const NewRTCPeerConnection = function(pcConfig, constraints) {
        logDetection("WebRTC Connection Attempt", config.webrtc);
        let sanitizedConfig = pcConfig ? { ...pcConfig } : {};
        if (config.webrtc) {
          console.warn("[Shield] Sanitizing WebRTC configuration to block STUN/TURN IP leaks.");
          if (sanitizedConfig.iceServers) {
            sanitizedConfig.iceServers = []; // Strip STUN/TURN servers
          }
        }
        const pc = new originalRTCPeerConnection(sanitizedConfig, constraints);
        
        // Intercept event listeners
        const originalAddEventListener = pc.addEventListener;
        pc.addEventListener = function(type, listener, options) {
          if (type === 'icecandidate' && config.webrtc) {
            const wrappedListener = function(event) {
              if (event.candidate) {
                logDetection("WebRTC ICE Candidate Leak Blocked", config.webrtc);
                return; // Suppress candidate details
              }
              listener.apply(this, arguments);
            };
            // Set name for toString mock
            mockedFunctions.set(wrappedListener, listener.name || '');
            return originalAddEventListener.call(this, type, wrappedListener, options);
          }
          return originalAddEventListener.apply(this, arguments);
        };
        
        // Intercept inline property setter
        Object.defineProperty(pc, 'onicecandidate', {
          set: function(listener) {
            if (config.webrtc) {
              const wrappedListener = function(event) {
                if (event.candidate) {
                  logDetection("WebRTC ICE Candidate Leak Blocked", config.webrtc);
                  return;
                }
                listener.apply(this, arguments);
              };
              mockedFunctions.set(wrappedListener, listener.name || '');
              this.addEventListener('icecandidate', wrappedListener);
            } else {
              this.addEventListener('icecandidate', listener);
            }
          }
        });
        
        return pc;
      };
      
      NewRTCPeerConnection.prototype = originalRTCPeerConnection.prototype;
      // Mark constructors for toString mockup
      mockedFunctions.set(NewRTCPeerConnection, 'RTCPeerConnection');
      
      window.RTCPeerConnection = NewRTCPeerConnection;
      if (window.webkitRTCPeerConnection) {
        window.webkitRTCPeerConnection = NewRTCPeerConnection;
      }
    }
  } catch (e) {}

  console.log("[Shield] Unified anti-surveillance hooks loaded with toString protection.");
})();
