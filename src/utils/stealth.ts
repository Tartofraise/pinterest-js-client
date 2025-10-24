/**
 * Stealth utilities and fingerprint generation for undetected browsing
 */

import { BrowserContext, Browser, Page } from 'playwright';
import { newInjectedContext } from 'fingerprint-injector';
import { FingerprintGenerator } from 'fingerprint-generator';

export class StealthManager {
  private fingerprintGenerator: FingerprintGenerator;

  constructor() {
    this.fingerprintGenerator = new FingerprintGenerator({
      browsers: [{ name: 'chrome', minVersion: 110 }],
      devices: ['desktop'],
      operatingSystems: ['windows'],
    });
  }

  /**
   * Create a stealth browser context with realistic fingerprints
   */
  async createStealthContext(browser: Browser): Promise<BrowserContext> {
    // Use fingerprint-injector to create context with injected fingerprint
    const context = await newInjectedContext(browser, {
      fingerprintOptions: {
        browsers: [{ name: 'chrome', minVersion: 110 }],
        devices: ['desktop'],
        operatingSystems: ['windows'],
        locales: ['en-US', 'en'],
      },
      newContextOptions: {
        locale: 'en-US',
        // IMPORTANT: Match timezone to your actual IP location
        // For France, use 'Europe/Paris' instead of 'America/New_York'
        timezoneId: 'Europe/Paris',
        permissions: ['geolocation', 'notifications'],
        colorScheme: 'light',
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        // CRITICAL: NO extraHTTPHeaders! They break CORS preflight requests
        // fingerprint-injector sets proper headers automatically
      },
    });

    return context;
  }

  /**
   * Apply additional stealth techniques to a page
   */
  async applyStealthToPage(page: Page): Promise<void> {
    // CRITICAL FIX: Use page.addInitScript with { type: 'module' } to ensure it runs in workers too
    await page.addInitScript(() => {
      // ============================================
      // FIX 1: CLIENT HINTS CONSISTENCY
      // ============================================
      // Override navigator.userAgentData to match User-Agent
      if (!(navigator as any).userAgentData) {
        Object.defineProperty(navigator, 'userAgentData', {
          get: () => ({
            brands: [
              { brand: 'Google Chrome', version: '120' },
              { brand: 'Chromium', version: '120' },
              { brand: 'Not(A:Brand', version: '24' }
            ],
            mobile: false,
            platform: 'Windows',
            getHighEntropyValues: async (hints: string[]) => {
              const values: any = {
                platform: 'Windows',
                platformVersion: '10.0.0',
                architecture: 'x86',
                model: '',
                uaFullVersion: '120.0.0.0',
                bitness: '64',
                fullVersionList: [
                  { brand: 'Google Chrome', version: '120.0.0.0' },
                  { brand: 'Chromium', version: '120.0.0.0' },
                  { brand: 'Not(A:Brand', version: '24.0.0.0' }
                ],
                brands: [
                  { brand: 'Google Chrome', version: '120' },
                  { brand: 'Chromium', version: '120' },
                  { brand: 'Not(A:Brand', version: '24' }
                ],
                mobile: false,
                wow64: false
              };
              const result: any = { brands: values.brands, mobile: false, platform: 'Windows' };
              hints.forEach(hint => {
                if (values[hint]) result[hint] = values[hint];
              });
              return result;
            },
            toJSON: function() {
              return {
                brands: this.brands,
                mobile: this.mobile,
                platform: this.platform
              };
            }
          }),
          configurable: true
        });
      }

      // ============================================
      // FIX 2: WEBDRIVER PROPERTY (CRITICAL)
      // ============================================
      // Multiple layers of protection for webdriver property
      
      // Layer 1: Delete from navigator directly
      delete (navigator as any).webdriver;
      
      // Layer 2: Delete from prototype chain
      if ((navigator as any).__proto__) {
        delete ((navigator as any).__proto__).webdriver;
      }
      
      // Layer 3: Override with getter that ALWAYS returns undefined
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        set: () => {},
        configurable: true,
        enumerable: false
      });
      
      // Layer 4: Override in Object.getOwnPropertyDescriptor to hide it completely
      const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
      Object.getOwnPropertyDescriptor = function(obj, prop) {
        if (obj === navigator && prop === 'webdriver') {
          return undefined;
        }
        return originalGetOwnPropertyDescriptor.call(this, obj, prop);
      };

      // ============================================
      // FIX 3: CONSISTENT NAVIGATOR PROPERTIES (Minimal overrides)
      // ============================================
      // Let fingerprint-injector handle most properties, we only fix what it misses

      // ============================================
      // FIX 4: CHROME OBJECT
      // ============================================
      if (!(window as any).chrome || Object.keys((window as any).chrome || {}).length === 0) {
        (window as any).chrome = {
          runtime: {
            OnInstalledReason: {
              CHROME_UPDATE: 'chrome_update',
              INSTALL: 'install',
              SHARED_MODULE_UPDATE: 'shared_module_update',
              UPDATE: 'update',
            },
            OnRestartRequiredReason: {
              APP_UPDATE: 'app_update',
              OS_UPDATE: 'os_update',
              PERIODIC: 'periodic',
            },
            PlatformArch: {
              ARM: 'arm',
              ARM64: 'arm64',
              MIPS: 'mips',
              MIPS64: 'mips64',
              X86_32: 'x86-32',
              X86_64: 'x86-64',
            },
            PlatformNaclArch: {
              ARM: 'arm',
              MIPS: 'mips',
              MIPS64: 'mips64',
              X86_32: 'x86-32',
              X86_64: 'x86-64',
            },
            PlatformOs: {
              ANDROID: 'android',
              CROS: 'cros',
              LINUX: 'linux',
              MAC: 'mac',
              OPENBSD: 'openbsd',
              WIN: 'win',
            },
            RequestUpdateCheckStatus: {
              NO_UPDATE: 'no_update',
              THROTTLED: 'throttled',
              UPDATE_AVAILABLE: 'update_available',
            }
          },
          loadTimes: function() {
            return {
              requestTime: Date.now() / 1000 - Math.random(),
              startLoadTime: Date.now() / 1000 - Math.random(),
              commitLoadTime: Date.now() / 1000 - Math.random(),
              finishDocumentLoadTime: Date.now() / 1000 - Math.random(),
              finishLoadTime: Date.now() / 1000 - Math.random(),
              firstPaintTime: Date.now() / 1000 - Math.random(),
              firstPaintAfterLoadTime: 0,
              navigationType: 'Other',
              wasFetchedViaSpdy: false,
              wasNpnNegotiated: true,
              npnNegotiatedProtocol: 'h2',
              wasAlternateProtocolAvailable: false,
              connectionInfo: 'h2'
            };
          },
          csi: function() {
            return {
              startE: Date.now(),
              onloadT: Date.now(),
              pageT: Math.random() * 1000,
              tran: 15
            };
          },
          app: {
            isInstalled: false,
            InstallState: {
              DISABLED: 'disabled',
              INSTALLED: 'installed',
              NOT_INSTALLED: 'not_installed'
            },
            RunningState: {
              CANNOT_RUN: 'cannot_run',
              READY_TO_RUN: 'ready_to_run',
              RUNNING: 'running'
            }
          }
        };
      }

      // ============================================
      // FIX 5: PLUGINS & MIMETYPES (Let fingerprint-injector handle)
      // ============================================
      // DON'T override plugins/mimeTypes - fingerprint-injector handles this correctly
      // Manual overrides cause "[object PluginArray]" serialization issues

      // ============================================
      // FIX 6: PERMISSIONS
      // ============================================
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission, onchange: null } as PermissionStatus) :
          originalQuery(parameters)
      );

      // ============================================
      // FIX 7: WEBGL CONSISTENCY
      // ============================================
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // UNMASKED_VENDOR_WEBGL
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        // UNMASKED_RENDERER_WEBGL
        if (parameter === 37446) {
          return 'Intel(R) UHD Graphics 630';
        }
        return getParameter.call(this, parameter);
      };

      // WebGL2 support
      if (typeof WebGL2RenderingContext !== 'undefined') {
        const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === 37445) {
            return 'Intel Inc.';
          }
          if (parameter === 37446) {
            return 'Intel(R) UHD Graphics 630';
          }
          return getParameter2.call(this, parameter);
        };
      }

      // ============================================
      // FIX 8: CANVAS - Add willReadFrequently to suppress warnings
      // ============================================
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(contextType: any, contextAttributes?: any) {
        // Add willReadFrequently for 2d contexts to suppress performance warnings
        if (contextType === '2d' || contextType === 'bitmaprenderer') {
          contextAttributes = contextAttributes || {};
          if (!('willReadFrequently' in contextAttributes)) {
            contextAttributes.willReadFrequently = true;
          }
        }
        return originalGetContext.call(this, contextType, contextAttributes);
      };

      // ============================================
      // FIX 9: IFRAME & CONTENTWINDOW
      // ============================================
      const originalCreateElement = document.createElement;
      document.createElement = function(tagName: string, options?: any) {
        const element = originalCreateElement.call(document, tagName, options);
        if (tagName.toLowerCase() === 'iframe') {
          // Don't override iframe behavior
        }
        return element;
      };

      // ============================================
      // FIX 10: CDP DETECTION (Performance.now)
      // ============================================
      const originalPerformanceNow = performance.now;
      let performanceOffset = Math.random() * 0.1;
      performance.now = function() {
        return originalPerformanceNow.call(performance) + performanceOffset;
      };

      // ============================================
      // FIX 11: REMOVE AUTOMATION SIGNALS
      // ============================================
      // Delete common automation properties
      const propsToDelete = [
        '__webdriver_script_fn',
        '__driver_evaluate',
        '__webdriver_evaluate',
        '__selenium_evaluate',
        '__fxdriver_evaluate',
        '__driver_unwrapped',
        '__webdriver_unwrapped',
        '__selenium_unwrapped',
        '__fxdriver_unwrapped',
        '__webdriver_script_func',
        '__webdriver_script_function',
        'domAutomation',
        'domAutomationController',
        '__nightmare',
        '_Selenium_IDE_Recorder',
        'callSelenium',
        '_selenium',
        'callPhantom',
        '_phantomjs',
        '__phantomas'
      ];

      propsToDelete.forEach(prop => {
        delete (window as any)[prop];
        delete (document as any)[prop];
      });

      // ============================================
      // FIX 12: SCREEN PROPERTIES
      // ============================================
      Object.defineProperty(screen, 'availWidth', {
        get: () => 1920,
        configurable: true
      });

      Object.defineProperty(screen, 'availHeight', {
        get: () => 1040,
        configurable: true
      });

      Object.defineProperty(screen, 'width', {
        get: () => 1920,
        configurable: true
      });

      Object.defineProperty(screen, 'height', {
        get: () => 1080,
        configurable: true
      });

      Object.defineProperty(screen, 'colorDepth', {
        get: () => 24,
        configurable: true
      });

      Object.defineProperty(screen, 'pixelDepth', {
        get: () => 24,
        configurable: true
      });

      // ============================================
      // FIX 13: WEBRTC LEAK PROTECTION
      // ============================================
      // Block WebRTC to prevent IP leaks
      const originalRTCPeerConnection = (window as any).RTCPeerConnection;
      const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;
      
      // Override RTCPeerConnection to prevent IP leaks
      if (originalRTCPeerConnection) {
        (window as any).RTCPeerConnection = function(config?: any) {
          // Remove real IP from ICE servers
          if (config && config.iceServers) {
            config.iceServers = [];
          }
          return new originalRTCPeerConnection(config);
        };
        (window as any).RTCPeerConnection.prototype = originalRTCPeerConnection.prototype;
      }

      // Also block webkitRTCPeerConnection
      if ((window as any).webkitRTCPeerConnection) {
        (window as any).webkitRTCPeerConnection = (window as any).RTCPeerConnection;
      }

      // ============================================
      // FIX 14: HIDE INCOGNITO MODE DETECTION
      // ============================================
      // Override FileSystemAPI to hide incognito detection
      if ('storage' in navigator && 'estimate' in (navigator as any).storage) {
        const originalEstimate = (navigator as any).storage.estimate;
        (navigator as any).storage.estimate = function() {
          return originalEstimate.call(this).then((result: any) => {
            // Make it look like we have normal storage (not incognito)
            return {
              quota: result.quota || 120000000000, // 120GB typical
              usage: result.usage || Math.floor(Math.random() * 10000000000), // Random usage
              usageDetails: result.usageDetails || {}
            };
          });
        };
      }

      // Override requestFileSystem to appear non-incognito
      if ((window as any).requestFileSystem) {
        const originalRequestFileSystem = (window as any).requestFileSystem;
        (window as any).requestFileSystem = function(...args: any[]) {
          return originalRequestFileSystem.apply(this, args);
        };
      }

      // Override temporary storage to hide incognito
      if ((window as any).webkitRequestFileSystem) {
        const originalWebkitRequestFileSystem = (window as any).webkitRequestFileSystem;
        (window as any).webkitRequestFileSystem = function(...args: any[]) {
          return originalWebkitRequestFileSystem.apply(this, args);
        };
      }

      // ============================================
      // FIX 15: BATTERY API (Incognito hides this)
      // ============================================
      if (!('getBattery' in navigator)) {
        (navigator as any).getBattery = function() {
          return Promise.resolve({
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 1,
            addEventListener: function() {},
            removeEventListener: function() {},
            dispatchEvent: function() { return true; },
            onchargingchange: null,
            onchargingtimechange: null,
            ondischargingtimechange: null,
            onlevelchange: null
          });
        };
      }

      // ============================================
      // FIX 16: CONNECTION API (More realistic)
      // ============================================
      if ('connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator) {
        const connectionObj = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (connectionObj) {
          Object.defineProperty(connectionObj, 'rtt', {
            get: () => 50, // 50ms typical
            configurable: true
          });
          Object.defineProperty(connectionObj, 'downlink', {
            get: () => 10, // 10 Mbps
            configurable: true
          });
          Object.defineProperty(connectionObj, 'effectiveType', {
            get: () => '4g',
            configurable: true
          });
          Object.defineProperty(connectionObj, 'saveData', {
            get: () => false,
            configurable: true
          });
        }
      }

      // ============================================
      // FIX 17: MEDIA DEVICES (Should be present)
      // ============================================
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
        navigator.mediaDevices.enumerateDevices = function() {
          return originalEnumerateDevices.call(this).then((devices: any[]) => {
            // Ensure we have at least some default devices
            if (devices.length === 0) {
              return [
                { deviceId: 'default', kind: 'audioinput', label: 'Default - Microphone', groupId: 'default' },
                { deviceId: 'communications', kind: 'audioinput', label: 'Communications - Microphone', groupId: 'communications' },
                { deviceId: 'default', kind: 'audiooutput', label: 'Default - Speaker', groupId: 'default' },
                { deviceId: 'communications', kind: 'audiooutput', label: 'Communications - Speaker', groupId: 'communications' },
                { deviceId: 'default', kind: 'videoinput', label: 'Default - Camera', groupId: 'default' }
              ];
            }
            return devices;
          });
        };
      }

      // ============================================
      // FIX 18: NOTIFICATION API
      // ============================================
      if ('Notification' in window && Notification.permission === 'default') {
        // Make it look like user was asked before (not fresh incognito)
        Object.defineProperty(Notification, 'permission', {
          get: () => 'denied', // Or 'granted' if you want
          configurable: true
        });
      }

    });

    // ============================================
    // CRITICAL: CONSISTENT WORKER VALUES  
    // ============================================
    // fingerprint-injector v2.1.75+ handles worker consistency automatically
    // No manual worker injection needed - it causes more detection issues
  }

  /**
   * Generate random human-like delays
   */
  randomDelay(min: number = 500, max: number = 2000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Simulate human-like mouse movements
   */
  async humanMouseMove(page: Page, selector: string): Promise<void> {
    const element = await page.$(selector);
    if (element) {
      const box = await element.boundingBox();
      if (box) {
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        
        // Move mouse in a curved path
        await page.mouse.move(x - 100, y - 100);
        await this.randomDelay(50, 150);
        await page.mouse.move(x - 50, y - 50);
        await this.randomDelay(50, 150);
        await page.mouse.move(x, y);
      }
    }
  }

  /**
   * Simulate human-like typing
   */
  async humanType(page: Page, selector: string, text: string): Promise<void> {
    await page.click(selector);
    await this.randomDelay(100, 300);
    
    for (const char of text) {
      await page.keyboard.type(char);
      await this.randomDelay(50, 200); // Random delay between keystrokes
    }
  }

  /**
   * Scroll page naturally
   */
  async humanScroll(page: Page, distance: number = 300): Promise<void> {
    await page.evaluate((scrollDistance) => {
      const scrollStep = 50;
      const scrolls = Math.floor(scrollDistance / scrollStep);
      let currentScroll = 0;
      
      const interval = setInterval(() => {
        window.scrollBy(0, scrollStep);
        currentScroll += scrollStep;
        
        if (currentScroll >= scrollDistance) {
          clearInterval(interval);
        }
      }, 50);
    }, distance);
    
    await this.randomDelay(500, 1000);
  }
}

