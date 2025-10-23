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
        timezoneId: 'America/New_York',
        permissions: ['geolocation', 'notifications'],
        colorScheme: 'light',
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Upgrade-Insecure-Requests': '1',
          'DNT': '1',
        },
      },
    });

    return context;
  }

  /**
   * Apply additional stealth techniques to a page
   */
  async applyStealthToPage(page: Page): Promise<void> {
    // Override navigator properties to avoid detection
    await page.addInitScript(() => {
      // Override webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' },
            description: 'Portable Document Format',
            filename: 'internal-pdf-viewer',
            length: 1,
            name: 'Chrome PDF Plugin',
          },
          {
            0: { type: 'application/pdf', suffixes: 'pdf', description: '' },
            description: '',
            filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
            length: 1,
            name: 'Chrome PDF Viewer',
          },
          {
            0: { type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable' },
            1: { type: 'application/x-pnacl', suffixes: '', description: 'Portable Native Client Executable' },
            description: '',
            filename: 'internal-nacl-plugin',
            length: 2,
            name: 'Native Client',
          },
        ],
      });

      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Override chrome property
      (window as any).chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {},
      };

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission } as PermissionStatus) :
          originalQuery(parameters)
      );

      // Add realistic canvas noise
      const getImageData = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
        const imageData = getImageData.call(this, x, y, w, h);
        for (let i = 0; i < imageData.data.length; i += 4) {
          // Add minimal noise to avoid detection
          imageData.data[i] = imageData.data[i] + Math.floor(Math.random() * 3) - 1;
          imageData.data[i + 1] = imageData.data[i + 1] + Math.floor(Math.random() * 3) - 1;
          imageData.data[i + 2] = imageData.data[i + 2] + Math.floor(Math.random() * 3) - 1;
        }
        return imageData;
      };

      // Override WebGL fingerprinting
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.call(this, parameter);
      };
    });

    // Set realistic browser behavior
    await page.addInitScript(() => {
      // Make Chrome appear more like a regular browser
      delete (navigator as any).__proto__.webdriver;
    });
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

